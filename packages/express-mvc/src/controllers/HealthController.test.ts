import { app } from '../../index'
import { HttpService } from '../services/HttpService'
import request from 'supertest'

describe('Test HealthController', () => {
    it('Get /health passes query params to repository', async () => {
        const express = app.resolve(HttpService).app
        const res = await request(express).get('/health').send()
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ status: 'OK' })
    })
})
