import { Request, Response, NextFunction } from 'express';
import { VaultService } from '../services/vaultService';

export class VaultController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const items = await VaultService.listUserItems(userId);
      res.status(200).json({
        success: true,
        count: items.length,
        items,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const item = await VaultService.getItemById(id, userId);
      res.status(200).json({
        success: true,
        item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { serviceName, websiteUrl, username, password, notes } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const item = await VaultService.createItem(userId, {
        serviceName,
        websiteUrl,
        username,
        password,
        notes,
        ip,
        userAgent,
      });

      res.status(201).json({
        success: true,
        message: 'Credential saved securely to vault.',
        item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { serviceName, websiteUrl, username, password, notes } = req.body;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      const item = await VaultService.updateItem(id, userId, {
        serviceName,
        websiteUrl,
        username,
        password,
        notes,
        ip,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Credential updated successfully.',
        item,
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const ip = req.ip || (req.headers['x-forwarded-for'] as string);
      const userAgent = req.headers['user-agent'];

      await VaultService.deleteItem(id, userId, ip, userAgent);

      res.status(200).json({
        success: true,
        message: 'Credential permanently removed from vault.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const analysis = await VaultService.analyzeSecurity(userId);
      res.status(200).json({
        success: true,
        analysis,
      });
    } catch (err) {
      next(err);
    }
  }
}
