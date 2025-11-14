import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignsDto } from './dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, createCampaignDto: CreateCampaignDto) {
    const { startDate, endDate, ...rest } = createCampaignDto;

    return this.prisma.campaign.create({
      data: {
        ...rest,
        tenantId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status: createCampaignDto.status || 'ACTIVE',
      },
    });
  }

  async findAll(tenantId: string, query: QueryCampaignsDto) {
    const { platform, status, search, page = 1, limit = 10 } = query;
    
    const where: any = { tenantId };

    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    }

    // Search disabled for SQLite compatibility
    // if (search) {
    //   where.name = {
    //     contains: search,
    //   };
    // }

    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { metrics: true },
          },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(tenantId: string, id: string, updateCampaignDto: UpdateCampaignDto) {
    // Check if campaign exists and belongs to tenant
    await this.findOne(tenantId, id);

    const { startDate, endDate, ...rest } = updateCampaignDto;

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    // Check if campaign exists and belongs to tenant
    await this.findOne(tenantId, id);

    // Soft delete by setting status to ENDED
    return this.prisma.campaign.update({
      where: { id },
      data: { status: 'ENDED' },
    });
  }

  async getCampaignMetrics(tenantId: string, id: string, startDate?: Date, endDate?: Date) {
    // Check if campaign exists and belongs to tenant
    await this.findOne(tenantId, id);

    const end = endDate || new Date();
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await this.prisma.metric.findMany({
      where: {
        campaignId: id,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate aggregated metrics
    const aggregated = metrics.reduce(
      (acc, m) => ({
        totalImpressions: acc.totalImpressions + m.impressions,
        totalClicks: acc.totalClicks + m.clicks,
        totalSpend: acc.totalSpend + m.spend,
        totalRevenue: acc.totalRevenue + m.revenue,
        totalConversions: acc.totalConversions + m.conversions,
      }),
      {
        totalImpressions: 0,
        totalClicks: 0,
        totalSpend: 0,
        totalRevenue: 0,
        totalConversions: 0,
      }
    );

    const avgCTR = aggregated.totalImpressions > 0 
      ? (aggregated.totalClicks / aggregated.totalImpressions) * 100 
      : 0;
    const avgCPC = aggregated.totalClicks > 0 
      ? aggregated.totalSpend / aggregated.totalClicks 
      : 0;
    const roas = aggregated.totalSpend > 0 
      ? aggregated.totalRevenue / aggregated.totalSpend 
      : 0;

    return {
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      aggregated: {
        ...aggregated,
        totalSpend: Number(aggregated.totalSpend.toFixed(2)),
        totalRevenue: Number(aggregated.totalRevenue.toFixed(2)),
        avgCTR: Number(avgCTR.toFixed(2)),
        avgCPC: Number(avgCPC.toFixed(2)),
        roas: Number(roas.toFixed(2)),
      },
      timeSeries: metrics.map(m => ({
        date: m.date.toISOString().split('T')[0],
        impressions: m.impressions,
        clicks: m.clicks,
        spend: Number(m.spend.toFixed(2)),
        revenue: Number(m.revenue.toFixed(2)),
        conversions: m.conversions,
        ctr: Number(m.ctr.toFixed(2)),
        cpc: Number(m.cpc.toFixed(2)),
        roas: Number(m.roas.toFixed(2)),
      })),
    };
  }
}
