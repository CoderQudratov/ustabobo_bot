import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import type { Telegraf } from 'telegraf';
import { Input } from 'telegraf';
import * as cron from 'node-cron';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '../../../generated/prisma/client';

/**
 * Har kuni 19:00 da (UTC+5 = 14:00 UTC) boss larga Excel kunlik hisobot.
 * Test qilish: .env da DAILY_REPORT_CRON='* * * * *' qo'ying (har daqiqa), keyin o'chiring.
 */
const CRON_SCHEDULE = process.env.DAILY_REPORT_CRON ?? '0 14 * * *';

@Injectable()
export class DailyReportCronService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  onModuleInit(): void {
    cron.schedule(CRON_SCHEDULE, () => this.runDailyReport());
  }

  private async runDailyReport(): Promise<void> {
    try {
      const to = new Date();
      to.setHours(19, 0, 0, 0);
      const from = new Date(to);
      from.setDate(from.getDate() - 1);
      from.setHours(19, 0, 0, 0);

      const orders = await this.prisma.order.findMany({
        where: {
          created_at: { gte: from, lte: to },
          status: OrderStatus.completed,
        },
        include: {
          master: true,
          organization: true,
          orderItems: {
            include: { service: true, product: true },
          },
        },
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Hisobot');

      sheet.columns = [
        { header: '№', key: 'num', width: 5 },
        { header: 'Sana', key: 'date', width: 18 },
        { header: 'Mijoz', key: 'client', width: 20 },
        { header: 'Mashina', key: 'car', width: 15 },
        { header: 'Usta', key: 'master', width: 20 },
        { header: 'Tashkilot', key: 'org', width: 20 },
        { header: 'Xizmatlar', key: 'services', width: 30 },
        { header: 'Summa', key: 'amount', width: 15 },
        { header: 'Holat', key: 'status', width: 18 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      };

      orders.forEach((o, i) => {
        sheet.addRow({
          num: i + 1,
          date: new Date(o.created_at).toLocaleString('uz-UZ'),
          client: `${o.client_name} — ${o.client_phone}`,
          car: `${o.car_number} ${o.car_model || ''}`.trim(),
          master: o.master?.fullname ?? '—',
          org: o.organization?.name ?? '—',
          services: o.orderItems
            .map(
              (item) =>
                item.service?.name ?? item.product?.name ?? item.item_name ?? '',
            )
            .filter(Boolean)
            .join(', '),
          amount: Number(o.total_amount),
          status: 'Tugallandi',
        });
      });

      const totalAmount = orders.reduce((s, o) => s + Number(o.total_amount), 0);
      const totalRow = sheet.addRow({
        num: '',
        date: '',
        client: '',
        car: '',
        master: '',
        org: '',
        services: 'JAMI:',
        amount: totalAmount,
        status: '',
      });
      totalRow.font = { bold: true };

      const filePath = path.join('/tmp', `hisobot_${Date.now()}.xlsx`);
      await workbook.xlsx.writeFile(filePath);

      const bosses = await this.prisma.user.findMany({
        where: {
          role: 'boss',
          is_active: true,
          tg_id: { not: null },
        },
      });

      const summary =
        '📊 Kunlik hisobot\n' +
        `📅 ${from.toLocaleDateString('uz-UZ')} — ${to.toLocaleDateString('uz-UZ')}\n` +
        '─────────────────\n' +
        `📦 Buyurtmalar: ${orders.length} ta\n` +
        `💰 Jami: ${totalAmount.toLocaleString('uz-UZ')} so'm`;

      const filename = `hisobot_${to.toLocaleDateString('uz-UZ')}.xlsx`;

      for (const boss of bosses) {
        const tgId = boss.tg_id!.trim();
        if (!tgId) continue;
        const chatId = Number(tgId);
        if (!Number.isFinite(chatId)) continue;
        try {
          await this.bot.telegram.sendMessage(chatId, summary);
          await this.bot.telegram.sendDocument(
            chatId,
            Input.fromLocalFile(filePath, filename),
          );
        } catch (err) {
          console.error('[DailyReportCron] send to boss failed:', tgId, err);
        }
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('[DailyReportCron] runDailyReport error:', err);
    }
  }
}
