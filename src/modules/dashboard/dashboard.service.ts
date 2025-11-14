import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string, startDate?: Date, endDate?: Date) {
    // Default to last 30 days if no date range provided
    const end = endDate || new Date();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get campaigns count
    const totalCampaigns = await this.prisma.campaign.count({
      where: { tenantId },
    });

    const activeCampaigns = await this.prisma.campaign.count({
      where: { 
        tenantId,
        status: 'ACTIVE',
      },
    });

    // Get metrics aggregation
    const metrics = await this.prisma.metric.aggregate({
      where: {
        campaign: { tenantId },
        date: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        spend: true,
        conversions: true,
        revenue: true,
      },
      _avg: {
        ctr: true,
        cpc: true,
        cpm: true,
        roas: true,
      },
    });

    // Calculate KPIs
    const totalRevenue = metrics._sum.revenue || 0;
    const totalSpend = metrics._sum.spend || 0;
    const totalProfit = totalRevenue - totalSpend;
    const roi = totalSpend > 0 ? ((totalProfit / totalSpend) * 100) : 0;

    return {
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        paused: totalCampaigns - activeCampaigns,
      },
      kpi: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalSpend: Number(totalSpend.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        roi: Number(roi.toFixed(2)),
        totalImpressions: metrics._sum.impressions || 0,
        totalClicks: metrics._sum.clicks || 0,
        totalConversions: metrics._sum.conversions || 0,
        averageCTR: Number((metrics._avg.ctr || 0).toFixed(2)),
        averageCPC: Number((metrics._avg.cpc || 0).toFixed(2)),
        averageCPM: Number((metrics._avg.cpm || 0).toFixed(2)),
        averageROAS: Number((metrics._avg.roas || 0).toFixed(2)),
      },
    };
  }

  async getTopCampaigns(tenantId: string, limit: number = 5, sortBy: 'revenue' | 'roas' | 'conversions' = 'revenue') {
    // Get campaigns with their latest metrics
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days
        },
      },
    });

    // Calculate aggregated metrics for each campaign
    const campaignsWithMetrics = campaigns.map(campaign => {
      const totalRevenue = campaign.metrics.reduce((sum, m) => sum + m.revenue, 0);
      const totalSpend = campaign.metrics.reduce((sum, m) => sum + m.spend, 0);
      const totalConversions = campaign.metrics.reduce((sum, m) => sum + m.conversions, 0);
      const avgROAS = campaign.metrics.length > 0 
        ? campaign.metrics.reduce((sum, m) => sum + m.roas, 0) / campaign.metrics.length 
        : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        metrics: {
          revenue: Number(totalRevenue.toFixed(2)),
          spend: Number(totalSpend.toFixed(2)),
          conversions: totalConversions,
          roas: Number(avgROAS.toFixed(2)),
        },
      };
    });

    // Sort by specified metric
    const sorted = campaignsWithMetrics.sort((a, b) => {
      if (sortBy === 'revenue') return b.metrics.revenue - a.metrics.revenue;
      if (sortBy === 'roas') return b.metrics.roas - a.metrics.roas;
      if (sortBy === 'conversions') return b.metrics.conversions - a.metrics.conversions;
      return 0;
    });

    return sorted.slice(0, limit);
  }

  async getPerformanceByPlatform(tenantId: string, startDate?: Date, endDate?: Date) {
    const end = endDate || new Date();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all campaigns grouped by platform
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId },
      include: {
        metrics: {
          where: {
            date: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    // Group by platform
    const platformMetrics: Record<string, any> = {};

    campaigns.forEach(campaign => {
      const platform = campaign.platform;
      
      if (!platformMetrics[platform]) {
        platformMetrics[platform] = {
          platform,
          campaignCount: 0,
          totalRevenue: 0,
          totalSpend: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
        };
      }

      platformMetrics[platform].campaignCount++;

      campaign.metrics.forEach(metric => {
        platformMetrics[platform].totalRevenue += metric.revenue;
        platformMetrics[platform].totalSpend += metric.spend;
        platformMetrics[platform].totalImpressions += metric.impressions;
        platformMetrics[platform].totalClicks += metric.clicks;
        platformMetrics[platform].totalConversions += metric.conversions;
      });
    });

    // Calculate derived metrics
    return Object.values(platformMetrics).map(pm => ({
      platform: pm.platform,
      campaignCount: pm.campaignCount,
      totalRevenue: Number(pm.totalRevenue.toFixed(2)),
      totalSpend: Number(pm.totalSpend.toFixed(2)),
      totalProfit: Number((pm.totalRevenue - pm.totalSpend).toFixed(2)),
      totalImpressions: pm.totalImpressions,
      totalClicks: pm.totalClicks,
      totalConversions: pm.totalConversions,
      roas: pm.totalSpend > 0 ? Number((pm.totalRevenue / pm.totalSpend).toFixed(2)) : 0,
      ctr: pm.totalImpressions > 0 ? Number(((pm.totalClicks / pm.totalImpressions) * 100).toFixed(2)) : 0,
    }));
  }

  async getTimeSeriesData(
    tenantId: string, 
    metric: 'impressions' | 'clicks' | 'spend' | 'revenue' | 'conversions',
    startDate?: Date, 
    endDate?: Date
  ) {
    const end = endDate || new Date();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await this.prisma.metric.findMany({
      where: {
        campaign: { tenantId },
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date and sum
    const grouped: Record<string, number> = {};
    
    metrics.forEach(m => {
      const dateKey = m.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = 0;
      }
      grouped[dateKey] += (m[metric] as number) || 0;
    });

    return Object.entries(grouped).map(([date, value]) => ({
      date,
      value: Number(value.toFixed(2)),
    }));
  }
}
