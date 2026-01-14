'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  AlertTriangle,
  Globe,
  RefreshCw,
  Loader2,
  TrendingUp,
  Shield,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TariffSummaryPanelProps {
  contractId: string;
  enterpriseId: string;
  className?: string;
  compact?: boolean;
  onRefresh?: () => void;
}

interface TariffData {
  contractId: string;
  contractValue: number;
  totalTariffExposure: number;
  tariffPercentage: number;
  tariffRiskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  tariffByCountry: Record<string, number>;
  lastCalculated: string | null;
  lineItemStats: {
    total: number;
    withHTS: number;
    needingClassification: number;
  };
}

interface CountryBreakdownItem {
  origin_country: string;
  origin_country_name: string;
  item_count: number;
  total_value: number;
  total_tariff_cost: number;
  avg_tariff_rate: number;
}

/**
 * Tariff Summary Panel - Bloomberg Terminal aesthetic
 * Displays contract tariff exposure, risk level, and country breakdown
 */
export default function TariffSummaryPanel({
  contractId,
  enterpriseId,
  className,
  compact = false,
  onRefresh,
}: TariffSummaryPanelProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [data, setData] = useState<TariffData | null>(null);
  const [countryBreakdown, setCountryBreakdown] = useState<CountryBreakdownItem[]>([]);

  useEffect(() => {
    loadTariffData();
  }, [contractId, enterpriseId]);

  const loadTariffData = async () => {
    if (!contractId || !enterpriseId) return;

    try {
      setLoading(true);

      // Type definitions for Supabase queries (until types are regenerated)
      interface ContractTariffData {
        id: string;
        value: number | null;
        total_tariff_exposure: number | null;
        tariff_by_country: Record<string, number> | null;
        tariff_risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical' | 'unknown' | null;
        tariff_last_calculated: string | null;
      }

      interface LineItemData {
        id: string;
        hts_code: string | null;
        origin_country: string | null;
      }

      // Fetch contract with tariff data
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select(`
          id,
          value,
          total_tariff_exposure,
          tariff_by_country,
          tariff_risk_level,
          tariff_last_calculated
        `)
        .eq('id', contractId)
        .eq('enterprise_id', enterpriseId)
        .single() as { data: ContractTariffData | null; error: Error | null };

      if (contractError) throw contractError;

      // Fetch line item statistics
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('contract_line_items')
        .select('id, hts_code, origin_country')
        .eq('contract_id', contractId) as { data: LineItemData[] | null; error: Error | null };

      if (lineItemsError) throw lineItemsError;

      const items = lineItems || [];
      const withHTS = items.filter((i) => i.hts_code).length;
      const needingClassification = items.filter((i) => i.origin_country && !i.hts_code).length;

      // Fetch country breakdown
      const { data: breakdown } = await (supabase as any).rpc('get_contract_tariff_by_country', {
        p_contract_id: contractId,
      }) as { data: CountryBreakdownItem[] | null; error: Error | null };

      setCountryBreakdown(breakdown || []);

      const tariffExposure = contract?.total_tariff_exposure || 0;
      const contractValue = contract?.value || 0;
      const tariffPercentage = contractValue > 0 ? (tariffExposure / contractValue) * 100 : 0;

      setData({
        contractId,
        contractValue,
        totalTariffExposure: tariffExposure,
        tariffPercentage,
        tariffRiskLevel: (contract?.tariff_risk_level as TariffData['tariffRiskLevel']) || 'unknown',
        tariffByCountry: contract?.tariff_by_country || {},
        lastCalculated: contract?.tariff_last_calculated ?? null,
        lineItemStats: {
          total: items.length,
          withHTS,
          needingClassification,
        },
      });
    } catch (error) {
      console.error('Error loading tariff data:', error);
      toast.error('Failed to load tariff data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/tariff-calculation/contract/${contractId}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to recalculate tariffs');

      toast.success('Tariffs recalculated successfully');
      await loadTariffData();
      onRefresh?.();
    } catch (error) {
      console.error('Error recalculating tariffs:', error);
      toast.error('Failed to recalculate tariffs');
    } finally {
      setRecalculating(false);
    }
  };

  const getRiskBadgeStyles = (level: string) => {
    const styles: Record<string, string> = {
      none: 'bg-green-50 text-green-700 border-green-200',
      low: 'bg-blue-50 text-blue-700 border-blue-200',
      medium: 'bg-amber-50 text-amber-700 border-amber-200',
      high: 'bg-orange-50 text-orange-700 border-orange-200',
      critical: 'bg-red-50 text-red-700 border-red-200',
      unknown: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return styles[level] || styles.unknown;
  };

  const getRiskIcon = (level: string) => {
    if (level === 'critical' || level === 'high') {
      return <AlertTriangle className="h-3 w-3" />;
    }
    if (level === 'medium') {
      return <TrendingUp className="h-3 w-3" />;
    }
    return <Shield className="h-3 w-3" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card className={cn('border border-ghost-300 bg-white', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <span className="ml-2 text-sm text-ghost-600">Loading tariff data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cn('border border-ghost-300 bg-white', className)}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-ghost-600 text-sm">
            No tariff data available for this contract.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border border-ghost-300 bg-white', className)}>
      {/* Header */}
      <CardHeader className="border-b border-ghost-300 bg-ghost-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-purple-500" />
            <div>
              <CardTitle className="text-sm font-semibold text-purple-900">
                Tariff Exposure
              </CardTitle>
              <p className="text-xs text-ghost-600 mt-0.5">
                Last calculated: {formatDate(data.lastCalculated)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="border-ghost-300 text-xs"
            >
              {recalculating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span className="ml-1.5">Recalculate</span>
            </Button>
            {compact && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="h-8 w-8 p-0"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Main Metrics Row */}
        <div className="grid grid-cols-3 divide-x divide-ghost-200 border-b border-ghost-200">
          {/* Total Exposure */}
          <div className="p-4 text-center">
            <p className="text-xs font-mono text-ghost-600 uppercase tracking-wider mb-1">
              Total Exposure
            </p>
            <p className="text-xl font-bold text-purple-900 font-mono">
              {formatCurrency(data.totalTariffExposure)}
            </p>
          </div>

          {/* Percentage of Contract */}
          <div className="p-4 text-center">
            <p className="text-xs font-mono text-ghost-600 uppercase tracking-wider mb-1">
              % of Contract
            </p>
            <p className="text-xl font-bold text-purple-900 font-mono">
              {formatPercentage(data.tariffPercentage)}
            </p>
          </div>

          {/* Risk Level */}
          <div className="p-4 text-center">
            <p className="text-xs font-mono text-ghost-600 uppercase tracking-wider mb-1">
              Risk Level
            </p>
            <Badge
              className={cn(
                'mt-1 gap-1 px-3 py-1 text-xs font-semibold uppercase border',
                getRiskBadgeStyles(data.tariffRiskLevel)
              )}
            >
              {getRiskIcon(data.tariffRiskLevel)}
              {data.tariffRiskLevel}
            </Badge>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <>
            {/* Line Item Stats */}
            <div className="px-6 py-4 border-b border-ghost-200 bg-ghost-50">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
                  Line Items
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-ghost-600">Total Items</p>
                  <p className="text-sm font-mono font-semibold text-ghost-900">
                    {data.lineItemStats.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ghost-600">With HTS Code</p>
                  <p className="text-sm font-mono font-semibold text-green-700">
                    {data.lineItemStats.withHTS}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ghost-600">Need Classification</p>
                  <p
                    className={cn(
                      'text-sm font-mono font-semibold',
                      data.lineItemStats.needingClassification > 0
                        ? 'text-amber-700'
                        : 'text-ghost-700'
                    )}
                  >
                    {data.lineItemStats.needingClassification}
                  </p>
                </div>
              </div>
            </div>

            {/* Country Breakdown */}
            {countryBreakdown.length > 0 && (
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">
                    By Country of Origin
                  </span>
                </div>
                <div className="space-y-2">
                  {countryBreakdown.slice(0, 5).map((country) => (
                    <div
                      key={country.origin_country}
                      className="flex items-center justify-between py-2 border-b border-ghost-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ghost-600 bg-ghost-100 px-2 py-0.5 border border-ghost-200">
                          {country.origin_country}
                        </span>
                        <span className="text-sm text-ghost-800">
                          {country.origin_country_name || country.origin_country}
                        </span>
                        <span className="text-xs text-ghost-500">
                          {country.item_count} item{country.item_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold text-purple-900">
                          {formatCurrency(country.total_tariff_cost)}
                        </p>
                        <p className="text-xs text-ghost-500">
                          {country.avg_tariff_rate.toFixed(1)}% avg rate
                        </p>
                      </div>
                    </div>
                  ))}
                  {countryBreakdown.length > 5 && (
                    <p className="text-xs text-ghost-500 text-center pt-2">
                      +{countryBreakdown.length - 5} more countries
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Warning for items needing classification */}
            {data.lineItemStats.needingClassification > 0 && (
              <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <span className="font-semibold">
                    {data.lineItemStats.needingClassification} item
                    {data.lineItemStats.needingClassification !== 1 ? 's' : ''} need
                  </span>{' '}
                  HTS classification. Complete classification to enable accurate tariff calculations.
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
