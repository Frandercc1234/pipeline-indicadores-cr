import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresRepository } from './indicadores.repository';
import { IndicadoresService } from './indicadores.service';

@Module({
  controllers: [IndicadoresController],
  providers: [IndicadoresService, IndicadoresRepository],
})
export class IndicadoresModule {}
