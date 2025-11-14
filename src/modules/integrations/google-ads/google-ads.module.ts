import { Module } from '@nestjs/common';
import { GoogleAdsController } from './google-ads.controller';
import { GoogleAdsIntegrationService } from './services/google-ads-integration.service';
import { GoogleAdsAuthService } from './services/google-ads-auth.service';
import { GoogleAdsClientService } from './services/google-ads-client.service';

@Module({
  controllers: [GoogleAdsController],
  providers: [
    GoogleAdsIntegrationService,
    GoogleAdsAuthService,
    GoogleAdsClientService,
  ],
  exports: [GoogleAdsIntegrationService],
})
export class GoogleAdsModule {}
