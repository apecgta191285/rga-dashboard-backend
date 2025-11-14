import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DateRangeDto } from './dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview with KPIs' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  async getOverview(@Request() req, @Query() query: DateRangeDto) {
    const tenantId = req.user.tenantId;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    
    return this.dashboardService.getOverview(tenantId, startDate, endDate);
  }

  @Get('top-campaigns')
  @ApiOperation({ summary: 'Get top performing campaigns' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['revenue', 'roas', 'conversions'], example: 'revenue' })
  async getTopCampaigns(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'revenue' | 'roas' | 'conversions',
  ) {
    const tenantId = req.user.tenantId;
    return this.dashboardService.getTopCampaigns(
      tenantId, 
      limit ? Number(limit) : 5,
      sortBy || 'revenue'
    );
  }

  @Get('performance-by-platform')
  @ApiOperation({ summary: 'Get performance metrics grouped by platform' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  async getPerformanceByPlatform(@Request() req, @Query() query: DateRangeDto) {
    const tenantId = req.user.tenantId;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    
    return this.dashboardService.getPerformanceByPlatform(tenantId, startDate, endDate);
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Get time series data for charts' })
  @ApiQuery({ name: 'metric', required: true, enum: ['impressions', 'clicks', 'spend', 'revenue', 'conversions'] })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2024-12-31' })
  async getTimeSeriesData(
    @Request() req,
    @Query('metric') metric: 'impressions' | 'clicks' | 'spend' | 'revenue' | 'conversions',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.dashboardService.getTimeSeriesData(tenantId, metric, start, end);
  }
}
