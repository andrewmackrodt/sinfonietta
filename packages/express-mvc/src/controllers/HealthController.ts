import { Controller, Get } from '../decorators/controller'
import { Request, Response } from 'express'
import { constants } from 'http2'

@Controller()
export class HealthController {
    @Get('health')
    public async getHealth(req: Request, res: Response): Promise<void> {
        res.status(constants.HTTP_STATUS_OK).json({ status: 'OK' })
    }
}
