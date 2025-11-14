import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: 'demo-tenant-001' },
    update: {},
    create: {
      id: 'demo-tenant-001',
      name: 'Demo Company',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create client user
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@test.com' },
    update: {},
    create: {
      email: 'client@test.com',
      password: hashedPassword,
      name: 'Client User',
      role: 'CLIENT',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created client user:', clientUser.email);

  // Create campaigns
  const campaigns = [
    {
      name: 'Summer Sale 2024',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 5000,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-31'),
      externalId: 'google_camp_001',
    },
    {
      name: 'Brand Awareness Q4',
      platform: 'FACEBOOK_ADS',
      status: 'ACTIVE',
      budget: 3000,
      startDate: new Date('2024-10-01'),
      externalId: 'facebook_camp_001',
    },
    {
      name: 'Product Launch',
      platform: 'GOOGLE_ADS',
      status: 'ACTIVE',
      budget: 7000,
      startDate: new Date('2024-09-01'),
      externalId: 'google_camp_002',
    },
    {
      name: 'Holiday Special',
      platform: 'TIKTOK_ADS',
      status: 'PAUSED',
      budget: 2000,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-12-31'),
      externalId: 'tiktok_camp_001',
    },
    {
      name: 'Retargeting Campaign',
      platform: 'FACEBOOK_ADS',
      status: 'ACTIVE',
      budget: 1500,
      startDate: new Date('2024-08-15'),
      externalId: 'facebook_camp_002',
    },
  ];

  console.log('📊 Creating campaigns...');
  
  const createdCampaigns = [];
  for (const campaignData of campaigns) {
    const campaign = await prisma.campaign.upsert({
      where: {
        tenantId_externalId: {
          tenantId: tenant.id,
          externalId: campaignData.externalId,
        },
      },
      update: campaignData,
      create: {
        ...campaignData,
        tenantId: tenant.id,
      },
    });
    createdCampaigns.push(campaign);
    console.log(`  ✅ ${campaign.name}`);
  }

  // Create metrics for last 30 days
  console.log('📈 Creating metrics for last 30 days...');
  
  const today = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const campaign of createdCampaigns) {
    let metricsCreated = 0;
    
    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      
      // Generate random but realistic metrics
      const impressions = Math.floor(Math.random() * 10000) + 5000;
      const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01)); // 1-6% CTR
      const spend = Math.random() * 500 + 100;
      const conversions = Math.floor(clicks * (Math.random() * 0.1 + 0.02)); // 2-12% conversion rate
      const revenue = conversions * (Math.random() * 100 + 50);
      
      const ctr = (clicks / impressions) * 100;
      const cpc = spend / clicks;
      const cpm = (spend / impressions) * 1000;
      const roas = spend > 0 ? revenue / spend : 0;

      try {
        await prisma.metric.create({
          data: {
            campaignId: campaign.id,
            date,
            impressions,
            clicks,
            spend,
            conversions,
            revenue,
            ctr,
            cpc,
            cpm,
            roas,
          },
        });
        metricsCreated++;
      } catch (error) {
        // Skip if already exists
      }
    }
    
    console.log(`  ✅ ${campaign.name}: ${metricsCreated} metrics`);
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
