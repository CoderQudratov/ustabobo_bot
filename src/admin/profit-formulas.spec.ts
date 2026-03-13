/**
 * Unit tests for profit and master-fee formulas (world-standard formulas).
 * Usta haqi = faqat xizmatlar tushumidan foiz; sof foyda = tushum - zapchast tannarx - ish haqi.
 */

describe('Profit and master fee formulas', () => {
  /** Usta haqi: faqat xizmatlar summasidan foiz (zapchast hisobga olinmaydi) */
  function masterFeeFromServices(
    servicesSum: number,
    percentRate: number,
  ): number {
    return Math.round((servicesSum * percentRate) / 100);
  }

  describe('masterFeeFromServices', () => {
    it('30% from 100_000 gives 30_000', () => {
      expect(masterFeeFromServices(100_000, 30)).toBe(30_000);
    });

    it('70% from 100_000 gives 70_000', () => {
      expect(masterFeeFromServices(100_000, 70)).toBe(70_000);
    });

    it('0% gives 0', () => {
      expect(masterFeeFromServices(100_000, 0)).toBe(0);
    });

    it('rounds to integer', () => {
      expect(masterFeeFromServices(100_000, 33)).toBe(33_000);
      expect(masterFeeFromServices(111_111, 30)).toBe(33_333);
    });
  });

  describe('Sof foyda formula', () => {
    function sofFoyda(
      tushum: number,
      zapchastTannarx: number,
      ishHaqi: number,
    ): number {
      const yalpiFoyda = tushum - zapchastTannarx;
      return yalpiFoyda - ishHaqi;
    }

    it('yalpi_foyda = tushum - zapchast_tannarx', () => {
      expect(sofFoyda(1_000_000, 200_000, 150_000)).toBe(650_000);
      expect(1_000_000 - 200_000 - 150_000).toBe(650_000);
    });

    it('when no zapchast and no ish_haqi, sof_foyda = tushum', () => {
      expect(sofFoyda(500_000, 0, 0)).toBe(500_000);
    });
  });
});
