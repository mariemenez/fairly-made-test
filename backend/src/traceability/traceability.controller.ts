import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import type { CorrectionInput, DeclaredTree } from '../domain/types';
import { TraceabilityService } from './traceability.service';

@Controller()
export class TraceabilityController {
  constructor(private readonly service: TraceabilityService) {}

  @Get('reference-data')
  getReferenceData() {
    return this.service.getReferenceData();
  }

  @Get('products')
  listProducts() {
    return this.service.listProducts();
  }

  @Get('products/:productId/working-tree')
  getWorkingTree(@Param('productId') productId: string) {
    return this.service.getWorkingTree(productId);
  }

  @Post('products/:productId/corrections')
  addCorrection(
    @Param('productId') productId: string,
    @Body() input: CorrectionInput,
  ) {
    return this.service.addCorrection(productId, input);
  }

  @Delete('products/:productId/corrections/:correctionId')
  removeCorrection(
    @Param('productId') productId: string,
    @Param('correctionId') correctionId: string,
  ) {
    return this.service.removeCorrection(productId, correctionId);
  }

  @Post('products/:productId/corrections/:correctionId/keep')
  @HttpCode(200)
  keepCorrection(
    @Param('productId') productId: string,
    @Param('correctionId') correctionId: string,
  ) {
    return this.service.keepCorrection(productId, correctionId);
  }

  @Post('products/:productId/refreshes')
  @HttpCode(200)
  receiveRefresh(
    @Param('productId') productId: string,
    @Body() tree: DeclaredTree,
  ) {
    return this.service.receiveRefresh(productId, tree);
  }

  @Post('products/:productId/refreshes/simulate')
  @HttpCode(200)
  simulateRefresh(@Param('productId') productId: string) {
    return this.service.simulateRefresh(productId);
  }

  @Post('products/:productId/versions')
  publish(@Param('productId') productId: string) {
    return this.service.publish(productId);
  }

  @Get('products/:productId/versions')
  listVersions(@Param('productId') productId: string) {
    return this.service.listVersions(productId);
  }

  @Get('products/:productId/versions/:versionNumber')
  getVersion(
    @Param('productId') productId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.service.getVersion(productId, versionNumber);
  }
}
