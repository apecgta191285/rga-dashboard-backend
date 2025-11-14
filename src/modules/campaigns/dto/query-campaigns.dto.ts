import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCampaignsDto {
  @ApiProperty({ required: false, enum: ['GOOGLE_ADS', 'FACEBOOK_ADS', 'TIKTOK_ADS', 'LINE_ADS', 'SHOPEE', 'LAZADA'] })
  @IsEnum(['GOOGLE_ADS', 'FACEBOOK_ADS', 'TIKTOK_ADS', 'LINE_ADS', 'SHOPEE', 'LAZADA'])
  @IsOptional()
  platform?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'PAUSED', 'ENDED'] })
  @IsEnum(['ACTIVE', 'PAUSED', 'ENDED'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, example: 'Summer' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false, example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
