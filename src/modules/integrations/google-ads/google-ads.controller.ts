import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAdsIntegrationService } from './services/google-ads-integration.service';
import { ConnectGoogleAdsDto, SyncCampaignsDto } from './dto';

@ApiTags('Google Ads Integration')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('integrations/google-ads')
export class GoogleAdsController {
  constructor(
    private readonly googleAdsService: GoogleAdsIntegrationService,
  ) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get Google OAuth2 authorization URL' })
  getAuthUrl() {
    return this.googleAdsService.getAuthUrl();
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle OAuth2 callback' })
  handleCallback(@Query('code') code: string) {
    return this.googleAdsService.handleCallback(code);
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect Google Ads account' })
  connect(@Body() dto: ConnectGoogleAdsDto) {
    // In real app, get tenantId from current user
    const tenantId = 'demo-tenant-id';
    return this.googleAdsService.connect(tenantId, dto);
  }

  @Post('sync-campaigns')
  @ApiOperation({ summary: 'Sync campaigns from Google Ads' })
  syncCampaigns(@Body() dto: SyncCampaignsDto) {
    // In real app, get tenantId from current user
    const tenantId = 'demo-tenant-id';
    return this.googleAdsService.syncCampaigns(tenantId, dto);
  }
}
