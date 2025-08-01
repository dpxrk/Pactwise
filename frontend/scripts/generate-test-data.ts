#!/usr/bin/env tsx
/**
 * Generate test data for performance testing
 * Creates realistic data distributions for accurate performance testing
 */

import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import chalk from "chalk";
import { faker } from "@faker-js/faker";

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://your-dev-instance.convex.cloud";

// Data generation profiles
const PROFILES = {
  small: {
    enterprises: 1,
    usersPerEnterprise: 5,
    vendorsPerEnterprise: 20,
    contractsPerEnterprise: 100,
    notificationsPerUser: 10,
  },
  medium: {
    enterprises: 3,
    usersPerEnterprise: 15,
    vendorsPerEnterprise: 50,
    contractsPerEnterprise: 500,
    notificationsPerUser: 25,
  },
  large: {
    enterprises: 5,
    usersPerEnterprise: 30,
    vendorsPerEnterprise: 100,
    contractsPerEnterprise: 2000,
    notificationsPerUser: 50,
  },
  stress: {
    enterprises: 10,
    usersPerEnterprise: 50,
    vendorsPerEnterprise: 200,
    contractsPerEnterprise: 5000,
    notificationsPerUser: 100,
  },
} as const;

type ProfileName = keyof typeof PROFILES;

// Initialize client
const client = new ConvexClient(CONVEX_URL);

// Contract templates
const CONTRACT_TYPES = ["nda", "msa", "sow", "saas", "lease", "employment", "partnership"] as const;
const CONTRACT_STATUSES = ["draft", "active", "expired", "terminated"] as const;

/**
 * Generate realistic enterprise data
 */
function generateEnterpriseData(index: number) {
  const company = faker.company.name();
  return {
    name: company,
    domain: faker.internet.domainName(),
    industry: faker.company.buzzNoun(),
    size: faker.helpers.arrayElement(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]),
    contractVolume: faker.helpers.arrayElement(["low", "medium", "high", "enterprise"]),
    primaryUseCase: [faker.company.buzzPhrase()],
    createdAt: faker.date.past({ years: 2 }).toISOString(),
  };
}

/**
 * Generate realistic user data
 */
function generateUserData(enterpriseId: Id<"enterprises">, index: number) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName });
  
  return {
    clerkId: `test_${faker.string.alphanumeric(20)}`,
    email,
    firstName,
    lastName,
    enterpriseId,
    role: faker.helpers.arrayElement(["owner", "admin", "manager", "user", "viewer"]),
    isActive: faker.datatype.boolean({ probability: 0.9 }),
    phoneNumber: faker.phone.number(),
    department: faker.commerce.department(),
    title: faker.person.jobTitle(),
    createdAt: faker.date.past({ years: 1 }).toISOString(),
  };
}

/**
 * Generate realistic vendor data
 */
function generateVendorData(enterpriseId: Id<"enterprises">, index: number) {
  const company = faker.company.name();
  const contactFirst = faker.person.firstName();
  const contactLast = faker.person.lastName();
  
  return {
    enterpriseId,
    name: company,
    contactName: `${contactFirst} ${contactLast}`,
    contactEmail: faker.internet.email({ firstName: contactFirst, lastName: contactLast }),
    contactPhone: faker.phone.number(),
    address: faker.location.streetAddress(true),
    notes: faker.lorem.paragraph(),
    website: faker.internet.url(),
    category: faker.helpers.arrayElement([
      "technology", "marketing", "legal", "finance", "hr",
      "facilities", "logistics", "manufacturing", "consulting", "other"
    ]),
    status: faker.helpers.arrayElement(["active", "inactive"]),
    performanceScore: faker.number.int({ min: 60, max: 100 }),
    totalContractValue: faker.number.int({ min: 10000, max: 1000000 }),
    activeContracts: faker.number.int({ min: 0, max: 10 }),
    complianceScore: faker.number.int({ min: 70, max: 100 }),
    createdAt: faker.date.past({ years: 2 }).toISOString(),
  };
}

/**
 * Generate realistic contract data
 */
function generateContractData(
  enterpriseId: Id<"enterprises">,
  vendorId: Id<"vendors">,
  ownerId: Id<"users">,
  index: number
) {
  const startDate = faker.date.past({ years: 2 });
  const endDate = faker.date.future({ years: 2, refDate: startDate });
  const contractType = faker.helpers.arrayElement(CONTRACT_TYPES);
  const status = faker.helpers.arrayElement(CONTRACT_STATUSES);
  
  return {
    enterpriseId,
    vendorId,
    title: `${contractType.toUpperCase()} - ${faker.company.name()} - ${faker.date.recent().getFullYear()}`,
    status,
    contractType,
    storageId: `test_storage_${faker.string.alphanumeric(10)}` as Id<"_storage">,
    fileName: `${contractType}_${faker.string.alphanumeric(8)}.pdf`,
    fileType: "application/pdf",
    value: faker.number.int({ min: 5000, max: 500000 }),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    extractedStartDate: startDate.toISOString(),
    extractedEndDate: endDate.toISOString(),
    extractedPricing: `$${faker.number.int({ min: 5000, max: 500000 }).toLocaleString()}`,
    extractedPaymentSchedule: faker.helpers.arrayElement(["Monthly", "Quarterly", "Annual", "One-time"]),
    extractedScope: faker.lorem.paragraph(),
    analysisStatus: faker.helpers.arrayElement(["pending", "processing", "completed", "failed"]),
    notes: faker.lorem.sentence(),
    ownerId,
    departmentId: faker.commerce.department(),
    createdBy: ownerId,
    createdAt: faker.date.past({ years: 1 }).toISOString(),
  };
}

/**
 * Generate notifications
 */
function generateNotificationData(
  enterpriseId: Id<"enterprises">,
  recipientId: Id<"users">,
  resourceId: string,
  index: number
) {
  const types = [
    "contract_created", "contract_updated", "contract_expiring",
    "vendor_updated", "approval_required", "mention"
  ];
  
  return {
    enterpriseId,
    recipientId,
    type: faker.helpers.arrayElement(types),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    message: faker.lorem.paragraph({ min: 1, max: 3 }),
    priority: faker.helpers.arrayElement(["low", "medium", "high"]),
    resourceId,
    resourceType: faker.helpers.arrayElement(["contract", "vendor", "user"]),
    actionUrl: `/dashboard/${faker.helpers.arrayElement(["contracts", "vendors"])}/${resourceId}`,
    read: faker.datatype.boolean({ probability: 0.3 }),
    createdAt: faker.date.recent({ days: 30 }).toISOString(),
  };
}

/**
 * Create test data with progress tracking
 */
async function createTestData(profile: ProfileName) {
  const config = PROFILES[profile];
  console.log(chalk.blue(`\n📊 Generating ${profile.toUpperCase()} test data set`));
  console.log(chalk.gray(JSON.stringify(config, null, 2)));

  const summary = {
    enterprises: [] as Id<"enterprises">[],
    users: [] as Id<"users">[],
    vendors: [] as Id<"vendors">[],
    contracts: [] as Id<"contracts">[],
    notifications: [] as Id<"notifications">[],
  };

  // Create enterprises
  console.log(chalk.blue(`\n🏢 Creating ${config.enterprises} enterprises...`));
  for (let i = 0; i < config.enterprises; i++) {
    const enterpriseData = generateEnterpriseData(i);
    const enterpriseId = await client.mutation(api.enterprises.create, enterpriseData);
    summary.enterprises.push(enterpriseId);
    console.log(chalk.gray(`  Created enterprise: ${enterpriseData.name}`));

    // Create users for this enterprise
    console.log(chalk.blue(`\n👥 Creating ${config.usersPerEnterprise} users for ${enterpriseData.name}...`));
    const enterpriseUsers: Id<"users">[] = [];
    
    for (let j = 0; j < config.usersPerEnterprise; j++) {
      const userData = generateUserData(enterpriseId, j);
      const userId = await client.mutation(api.users.create, userData);
      enterpriseUsers.push(userId);
      summary.users.push(userId);
      
      if ((j + 1) % 5 === 0) {
        process.stdout.write(".");
      }
    }
    console.log(chalk.green(` ✓`));

    // Create vendors for this enterprise
    console.log(chalk.blue(`\n🏪 Creating ${config.vendorsPerEnterprise} vendors...`));
    const enterpriseVendors: Id<"vendors">[] = [];
    
    for (let j = 0; j < config.vendorsPerEnterprise; j++) {
      const vendorData = generateVendorData(enterpriseId, j);
      const vendorId = await client.mutation(api.vendors.create, vendorData);
      enterpriseVendors.push(vendorId);
      summary.vendors.push(vendorId);
      
      if ((j + 1) % 10 === 0) {
        process.stdout.write(".");
      }
    }
    console.log(chalk.green(` ✓`));

    // Create contracts for this enterprise
    console.log(chalk.blue(`\n📄 Creating ${config.contractsPerEnterprise} contracts...`));
    const batchSize = 50;
    
    for (let j = 0; j < config.contractsPerEnterprise; j += batchSize) {
      const batch = [];
      
      for (let k = 0; k < Math.min(batchSize, config.contractsPerEnterprise - j); k++) {
        const idx = j + k;
        const vendorId = faker.helpers.arrayElement(enterpriseVendors);
        const ownerId = faker.helpers.arrayElement(enterpriseUsers);
        const contractData = generateContractData(enterpriseId, vendorId, ownerId, idx);
        
        batch.push(client.mutation(api.contracts.createContract, {
          enterpriseId: contractData.enterpriseId,
          vendorId: contractData.vendorId,
          title: contractData.title,
          storageId: contractData.storageId,
          fileName: contractData.fileName,
          fileType: contractData.fileType,
          contractType: contractData.contractType,
          notes: contractData.notes,
        }));
      }
      
      const contractIds = await Promise.all(batch);
      summary.contracts.push(...contractIds);
      
      console.log(chalk.gray(`  Created ${j + batch.length}/${config.contractsPerEnterprise} contracts`));
    }

    // Create notifications
    console.log(chalk.blue(`\n🔔 Creating notifications...`));
    for (const userId of enterpriseUsers) {
      for (let j = 0; j < config.notificationsPerUser; j++) {
        const resourceId = faker.helpers.arrayElement([
          ...summary.contracts.slice(-20),
          ...summary.vendors.slice(-10),
        ]);
        
        const notificationData = generateNotificationData(
          enterpriseId,
          userId,
          resourceId,
          j
        );
        
        const notificationId = await client.mutation(api.notifications.create, notificationData);
        summary.notifications.push(notificationId);
      }
    }
    console.log(chalk.green(`  Created ${enterpriseUsers.length * config.notificationsPerUser} notifications ✓`));
  }

  return summary;
}

/**
 * Verify generated data
 */
async function verifyData(summary: any) {
  console.log(chalk.blue("\n🔍 Verifying generated data..."));

  const checks = [
    {
      name: "Enterprises",
      count: summary.enterprises.length,
      sample: async () => {
        const enterprise = await client.query(api.enterprises.getById, {
          id: summary.enterprises[0]
        });
        return enterprise?.name;
      }
    },
    {
      name: "Users",
      count: summary.users.length,
      sample: async () => {
        const user = await client.query(api.users.getById, {
          id: summary.users[0]
        });
        return user?.email;
      }
    },
    {
      name: "Vendors",
      count: summary.vendors.length,
      sample: async () => {
        const vendor = await client.query(api.vendors.getById, {
          id: summary.vendors[0]
        });
        return vendor?.name;
      }
    },
    {
      name: "Contracts",
      count: summary.contracts.length,
      sample: async () => {
        const contract = await client.query(api.contracts.getById, {
          id: summary.contracts[0]
        });
        return contract?.title;
      }
    },
  ];

  for (const check of checks) {
    try {
      const sample = await check.sample();
      console.log(chalk.green(`  ✓ ${check.name}: ${check.count} created (sample: ${sample})`));
    } catch (error) {
      console.log(chalk.red(`  ✗ ${check.name}: Failed to verify`));
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const profile = (args[0] as ProfileName) || "small";

  if (!PROFILES[profile]) {
    console.error(chalk.red(`Invalid profile: ${profile}`));
    console.log(chalk.gray(`Available profiles: ${Object.keys(PROFILES).join(", ")}`));
    process.exit(1);
  }

  console.log(chalk.blue.bold("🚀 Test Data Generator"));
  console.log(chalk.gray(`Convex URL: ${CONVEX_URL}`));
  console.log(chalk.gray(`Profile: ${profile}`));

  try {
    const startTime = Date.now();
    
    // Generate data
    const summary = await createTestData(profile);
    
    // Verify data
    await verifyData(summary);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(chalk.green.bold(`\n✅ Test data generation completed in ${duration}s!`));
    console.log(chalk.blue("\n📊 Summary:"));
    console.log(chalk.gray(`  - Enterprises: ${summary.enterprises.length}`));
    console.log(chalk.gray(`  - Users: ${summary.users.length}`));
    console.log(chalk.gray(`  - Vendors: ${summary.vendors.length}`));
    console.log(chalk.gray(`  - Contracts: ${summary.contracts.length}`));
    console.log(chalk.gray(`  - Notifications: ${summary.notifications.length}`));
    
    // Save summary to file
    const fs = await import("fs/promises");
    const summaryPath = `./test-data-${profile}-${Date.now()}.json`;
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(chalk.gray(`\n💾 Summary saved to: ${summaryPath}`));

  } catch (error) {
    console.error(chalk.red("\n❌ Failed to generate test data:"), error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);