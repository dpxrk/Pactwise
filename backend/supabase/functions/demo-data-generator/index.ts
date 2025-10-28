import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

interface GeneratorConfig {
  industry: string;
  companySize: 'startup' | 'smb' | 'midmarket' | 'enterprise';
  months: number;
  contractCount?: number;
  vendorCount?: number;
  scenario?: string;
}

interface ContractData {
  id: string;
  enterprise_id: string;
  title: string;
  vendor_id?: string;
  contract_type: string;
  status: string;
  value: number;
  actual_spend: number;
  start_date: string;
  end_date: string;
  auto_renewal: boolean;
  payment_terms: string;
  compliance_score: number;
  risk_score: number;
  metadata: Record<string, unknown>;
}

interface VendorData {
  id: string;
  enterprise_id: string;
  name: string;
  category: string;
  subcategory?: string;
  performance_score: number;
  compliance_status: string;
  risk_level: string;
  total_spend: number;
  contract_count: number;
  on_time_delivery_rate: number;
  quality_score: number;
  metadata: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry, companySize, months = 24, contractCount, vendorCount, scenario } = await req.json() as GeneratorConfig;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the enterprise ID from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Get user's enterprise
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('enterprise_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new Error('Enterprise not found');
    }

    const enterpriseId = userData.enterprise_id;

    // Load industry benchmarks
    const { data: benchmarks, error: benchmarkError } = await supabaseClient
      .from('industry_benchmarks_master')
      .select('*')
      .eq('industry', industry)
      .in('company_size_segment', [companySize, 'All']);

    if (benchmarkError) {
      throw benchmarkError;
    }

    // Generate data based on industry and company size
    const contracts = await generateContracts({
      enterpriseId,
      industry,
      companySize,
      months,
      count: contractCount || getDefaultContractCount(companySize),
      benchmarks
    });

    const vendors = await generateVendors({
      enterpriseId,
      industry,
      companySize,
      count: vendorCount || getDefaultVendorCount(companySize),
      contracts,
      benchmarks
    });

    // Insert generated data
    const { error: contractError } = await supabaseClient
      .from('contracts')
      .insert(contracts);

    if (contractError) {
      console.error('Error inserting contracts:', contractError);
      throw contractError;
    }

    const { error: vendorError } = await supabaseClient
      .from('vendors')
      .insert(vendors);

    if (vendorError) {
      console.error('Error inserting vendors:', vendorError);
      throw vendorError;
    }

    // Generate insights based on benchmarks
    const insights = generateInsights(contracts, vendors, benchmarks);

    // Log the generation for learning
    await supabaseClient
      .from('learning_from_demo')
      .insert({
        enterprise_id: enterpriseId,
        industry,
        metric_category: 'generation',
        metric_name: 'demo_data_created',
        demo_value: contracts.length,
        actual_value: contracts.length,
        insight_generated: `Generated ${contracts.length} contracts and ${vendors.length} vendors for ${industry} ${companySize}`
      });

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          contractsGenerated: contracts.length,
          vendorsGenerated: vendors.length,
          totalValue: contracts.reduce((sum, c) => sum + c.value, 0),
          insights
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error generating demo data:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate demo data'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});

function getDefaultContractCount(companySize: string): number {
  const counts = {
    startup: 50,
    smb: 150,
    midmarket: 500,
    enterprise: 1500
  };
  return counts[companySize] || 100;
}

function getDefaultVendorCount(companySize: string): number {
  const counts = {
    startup: 20,
    smb: 50,
    midmarket: 150,
    enterprise: 400
  };
  return counts[companySize] || 50;
}

async function generateContracts(params: {
  enterpriseId: string;
  industry: string;
  companySize: string;
  months: number;
  count: number;
  benchmarks: unknown[];
}): Promise<ContractData[]> {
  const contracts: ContractData[] = [];
  const contractTypes = getContractTypesByIndustry(params.industry);
  const now = new Date();

  // Get relevant benchmarks
  const valueBenchmark = params.benchmarks.find(b => b.metric_name.includes('contract_value'));
  const processingTimeBenchmark = params.benchmarks.find(b => b.metric_name.includes('turnaround'));
  const complianceBenchmark = params.benchmarks.find(b => b.metric_name.includes('compliance'));

  for (let i = 0; i < params.count; i++) {
    const contractType = selectWeightedRandom(contractTypes);
    const startDate = new Date(now.getTime() - Math.random() * params.months * 30 * 24 * 60 * 60 * 1000);
    const duration = getContractDuration(params.industry, contractType);
    const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
    
    // Generate value based on percentile distribution
    const percentile = Math.random();
    const value = interpolatePercentile(valueBenchmark, percentile, params.companySize);
    
    // Calculate actual spend (with utilization variance)
    const utilization = 0.4 + Math.random() * 0.6; // 40-100% utilization
    const actualSpend = value * utilization * (endDate > now ? 
      (now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime()) : 1);

    contracts.push({
      id: crypto.randomUUID(),
      enterprise_id: params.enterpriseId,
      title: generateContractTitle(contractType, i),
      contract_type: contractType,
      status: getContractStatus(startDate, endDate, now),
      value: Math.round(value),
      actual_spend: Math.round(actualSpend),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      auto_renewal: Math.random() > 0.25, // 75% auto-renewal
      payment_terms: getPaymentTerms(params.industry),
      compliance_score: 70 + Math.random() * 30, // 70-100
      risk_score: Math.random() * 30, // 0-30
      metadata: {
        industry: params.industry,
        company_size: params.companySize,
        generated: true,
        benchmark_percentile: Math.round(percentile * 100)
      }
    });
  }

  return contracts;
}

async function generateVendors(params: {
  enterpriseId: string;
  industry: string;
  companySize: string;
  count: number;
  contracts: ContractData[];
  benchmarks: unknown[];
}): Promise<VendorData[]> {
  const vendors: VendorData[] = [];
  const vendorCategories = getVendorCategoriesByIndustry(params.industry);
  
  // Get relevant benchmarks
  const performanceBenchmark = params.benchmarks.find(b => b.metric_name.includes('on_time_delivery'));
  const qualityBenchmark = params.benchmarks.find(b => b.metric_name.includes('quality') || b.metric_name.includes('defect'));

  for (let i = 0; i < params.count; i++) {
    const category = selectWeightedRandom(vendorCategories);
    const vendorContracts = params.contracts.filter((_, index) => 
      index % params.count === i
    );
    
    const totalSpend = vendorContracts.reduce((sum, c) => sum + c.actual_spend, 0);
    
    // Generate performance based on benchmarks
    const performancePercentile = Math.random();
    const onTimeDelivery = interpolatePercentile(performanceBenchmark, performancePercentile, 'All');
    const qualityScore = interpolatePercentile(qualityBenchmark, performancePercentile, 'All');

    vendors.push({
      id: crypto.randomUUID(),
      enterprise_id: params.enterpriseId,
      name: generateVendorName(category, i),
      category,
      subcategory: getSubcategory(params.industry, category),
      performance_score: 60 + Math.random() * 40, // 60-100
      compliance_status: Math.random() > 0.1 ? 'compliant' : 'pending',
      risk_level: getRiskLevel(performancePercentile),
      total_spend: Math.round(totalSpend),
      contract_count: vendorContracts.length,
      on_time_delivery_rate: onTimeDelivery || (75 + Math.random() * 25),
      quality_score: qualityScore || (80 + Math.random() * 20),
      metadata: {
        industry: params.industry,
        company_size: params.companySize,
        generated: true,
        performance_percentile: Math.round(performancePercentile * 100)
      }
    });

    // Assign vendor to contracts
    vendorContracts.forEach(contract => {
      contract.vendor_id = vendors[i].id;
    });
  }

  return vendors;
}

function generateInsights(contracts: ContractData[], vendors: VendorData[], benchmarks: unknown[]): BenchmarkInsights {
  const totalValue = contracts.reduce((sum, c) => sum + c.value, 0);
  const totalSpend = contracts.reduce((sum, c) => sum + c.actual_spend, 0);
  const utilization = totalSpend / totalValue;
  
  const avgComplianceScore = contracts.reduce((sum, c) => sum + c.compliance_score, 0) / contracts.length;
  const avgRiskScore = contracts.reduce((sum, c) => sum + c.risk_score, 0) / contracts.length;
  
  const avgVendorPerformance = vendors.reduce((sum, v) => sum + v.performance_score, 0) / vendors.length;
  const avgOnTimeDelivery = vendors.reduce((sum, v) => sum + v.on_time_delivery_rate, 0) / vendors.length;

  return {
    contractMetrics: {
      totalValue,
      totalSpend,
      utilization: Math.round(utilization * 100),
      averageContractValue: Math.round(totalValue / contracts.length),
      activeContracts: contracts.filter(c => c.status === 'active').length
    },
    complianceMetrics: {
      averageComplianceScore: Math.round(avgComplianceScore),
      averageRiskScore: Math.round(avgRiskScore),
      highRiskContracts: contracts.filter(c => c.risk_score > 20).length
    },
    vendorMetrics: {
      totalVendors: vendors.length,
      averagePerformanceScore: Math.round(avgVendorPerformance),
      averageOnTimeDelivery: Math.round(avgOnTimeDelivery),
      highPerformingVendors: vendors.filter(v => v.performance_score > 85).length
    },
    recommendations: [
      utilization < 0.5 ? 'Consider consolidating underutilized contracts' : null,
      avgRiskScore > 15 ? 'Review high-risk contracts for mitigation strategies' : null,
      avgOnTimeDelivery < 85 ? 'Work with vendors to improve delivery performance' : null
    ].filter(Boolean)
  };
}

// Helper functions
function getContractTypesByIndustry(industry: string): Array<{ type: string; weight: number }> {
  const types = {
    'Technology': [
      { type: 'SaaS Agreement', weight: 0.4 },
      { type: 'MSA', weight: 0.2 },
      { type: 'Software License', weight: 0.15 },
      { type: 'Support Agreement', weight: 0.15 },
      { type: 'NDA', weight: 0.1 }
    ],
    'Healthcare': [
      { type: 'Medical Device', weight: 0.25 },
      { type: 'Pharmaceutical', weight: 0.2 },
      { type: 'Service Agreement', weight: 0.2 },
      { type: 'BAA', weight: 0.15 },
      { type: 'Staffing', weight: 0.2 }
    ],
    'Manufacturing': [
      { type: 'Supply Agreement', weight: 0.35 },
      { type: 'Logistics', weight: 0.2 },
      { type: 'Equipment Lease', weight: 0.15 },
      { type: 'Service Contract', weight: 0.2 },
      { type: 'Quality Agreement', weight: 0.1 }
    ],
    'Financial Services': [
      { type: 'Service Agreement', weight: 0.3 },
      { type: 'Software License', weight: 0.2 },
      { type: 'Compliance Services', weight: 0.2 },
      { type: 'Data Services', weight: 0.15 },
      { type: 'Advisory Services', weight: 0.15 }
    ],
    'Retail': [
      { type: 'Supplier Agreement', weight: 0.35 },
      { type: 'Logistics Contract', weight: 0.2 },
      { type: 'Marketing Services', weight: 0.15 },
      { type: 'Technology Services', weight: 0.15 },
      { type: 'Lease Agreement', weight: 0.15 }
    ],
    'E-commerce': [
      { type: 'Dropshipping Agreement', weight: 0.25 },
      { type: 'Payment Processing', weight: 0.2 },
      { type: 'Fulfillment Services', weight: 0.2 },
      { type: 'Marketing Services', weight: 0.2 },
      { type: 'Technology Platform', weight: 0.15 }
    ],
    'Government': [
      { type: 'IDIQ', weight: 0.25 },
      { type: 'Fixed Price', weight: 0.3 },
      { type: 'Cost Plus', weight: 0.15 },
      { type: 'Time and Materials', weight: 0.2 },
      { type: 'GSA Schedule', weight: 0.1 }
    ]
  };
  
  return types[industry] || types['Technology'];
}

function getVendorCategoriesByIndustry(industry: string): Array<{ type: string; weight: number }> {
  const categories = {
    'Technology': [
      { type: 'Software', weight: 0.35 },
      { type: 'IT Services', weight: 0.25 },
      { type: 'Cloud Infrastructure', weight: 0.2 },
      { type: 'Security', weight: 0.1 },
      { type: 'Hardware', weight: 0.1 }
    ],
    'Healthcare': [
      { type: 'Medical Devices', weight: 0.25 },
      { type: 'Pharmaceuticals', weight: 0.25 },
      { type: 'Medical Services', weight: 0.2 },
      { type: 'IT Systems', weight: 0.15 },
      { type: 'Staffing', weight: 0.15 }
    ],
    'Manufacturing': [
      { type: 'Raw Materials', weight: 0.3 },
      { type: 'Components', weight: 0.25 },
      { type: 'Equipment', weight: 0.15 },
      { type: 'Logistics', weight: 0.15 },
      { type: 'Services', weight: 0.15 }
    ]
  };
  
  return categories[industry] || categories['Technology'];
}

function selectWeightedRandom(items: Array<{ type: string; weight: number }>): string {
  const random = Math.random();
  let cumulative = 0;
  
  for (const item of items) {
    cumulative += item.weight;
    if (random < cumulative) {
      return item.type;
    }
  }
  
  return items[items.length - 1].type;
}

function interpolatePercentile(benchmark: BenchmarkData, percentile: number, companySize: string): number {
  if (!benchmark) return 50000 + Math.random() * 100000;
  
  // Adjust based on company size
  const sizeMultiplier = {
    startup: 0.5,
    smb: 0.75,
    midmarket: 1.0,
    enterprise: 1.5
  }[companySize] || 1.0;
  
  let value: number;
  if (percentile <= 0.1) {
    value = benchmark.p10_value || benchmark.p25_value * 0.8;
  } else if (percentile <= 0.25) {
    value = benchmark.p25_value || benchmark.p50_value * 0.75;
  } else if (percentile <= 0.5) {
    value = benchmark.p50_value || benchmark.mean_value;
  } else if (percentile <= 0.75) {
    value = benchmark.p75_value || benchmark.p50_value * 1.5;
  } else if (percentile <= 0.9) {
    value = benchmark.p90_value || benchmark.p75_value * 1.5;
  } else {
    value = benchmark.p95_value || benchmark.p90_value * 1.25;
  }
  
  return value * sizeMultiplier * (0.9 + Math.random() * 0.2); // Add 10% variance
}

function getContractDuration(industry: string, contractType: string): number {
  const baseDurations = {
    'SaaS Agreement': 365,
    'MSA': 730,
    'Software License': 1095,
    'Support Agreement': 365,
    'NDA': 1825,
    'Medical Device': 730,
    'Pharmaceutical': 365,
    'Service Agreement': 365,
    'BAA': 365,
    'Staffing': 180,
    'Supply Agreement': 730,
    'IDIQ': 1825,
    'Fixed Price': 365,
    'GSA Schedule': 1825
  };
  
  return baseDurations[contractType] || 365;
}

function getContractStatus(startDate: Date, endDate: Date, now: Date): string {
  if (startDate > now) return 'pending';
  if (endDate < now) return 'expired';
  const daysToExpiry = (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysToExpiry < 90) return 'expiring_soon';
  return 'active';
}

function getPaymentTerms(industry: string): string {
  const terms = ['Net 30', 'Net 45', 'Net 60', '2/10 Net 30', 'Due on Receipt'];
  const industryDefaults = {
    'Government': 'Net 30',
    'Healthcare': 'Net 45',
    'Manufacturing': 'Net 30',
    'Technology': 'Net 30',
    'Financial Services': 'Due on Receipt'
  };
  
  return industryDefaults[industry] || terms[Math.floor(Math.random() * terms.length)];
}

function getRiskLevel(performancePercentile: number): string {
  if (performancePercentile > 0.75) return 'low';
  if (performancePercentile > 0.5) return 'medium';
  if (performancePercentile > 0.25) return 'high';
  return 'critical';
}

function generateContractTitle(type: string, index: number): string {
  const prefixes = ['Enterprise', 'Professional', 'Premium', 'Standard', 'Custom'];
  const suffix = String(index + 1).padStart(4, '0');
  return `${prefixes[index % prefixes.length]} ${type} - ${suffix}`;
}

function generateVendorName(category: string, index: number): string {
  const prefixes = ['Global', 'Premier', 'Advanced', 'Innovative', 'Strategic'];
  const suffixes = ['Solutions', 'Systems', 'Services', 'Technologies', 'Partners'];
  return `${prefixes[index % prefixes.length]} ${category} ${suffixes[index % suffixes.length]}`;
}

function getSubcategory(industry: string, category: string): string {
  // Return more specific subcategory based on industry and category
  const subcategories = {
    'Technology': {
      'Software': 'SaaS Platform',
      'IT Services': 'Managed Services',
      'Cloud Infrastructure': 'IaaS Provider'
    },
    'Healthcare': {
      'Medical Devices': 'Diagnostic Equipment',
      'Pharmaceuticals': 'Specialty Drugs',
      'Medical Services': 'Clinical Services'
    }
  };
  
  return subcategories[industry]?.[category] || category;
}