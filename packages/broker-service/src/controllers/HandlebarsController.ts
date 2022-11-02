import { Controller, Get } from '@lib/express-mvc/decorators/controller'
import { Request, Response } from 'express'

@Controller()
export class HandlebarsController {
    @Get('handlebars')
    public async getHome(req: Request, res: Response): Promise<void> {
        res.render('home', { isoTime: new Date().toISOString() })
    }
}
