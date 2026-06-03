import {
  PrismaClient,
  UserRole,
  ShiftRole,
  ReservationStatus,
  ReservationSource,
  PaymentMethod,
  PaymentStatus,
  ReservationPaymentState,
  PageStatus,
  PageType,
  PageSectionType,
  LinkType,
  RobotsIndex,
  RobotsFollow,
  CommissionType,
  CommissionStatus,
  GameStationType,
} from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

/**
 * -----------------------------
 * CONFIG — Professional Gaming Center Setup
 * -----------------------------
 */
const CONFIG = {
  gamingCentersCount: 5,
  totalCustomers: 40,
  stationsPerCenter: 15,
  bookingsPerCenter: 30,
};

type IranCity = {
  province: string;
  city: string;
  citySlug: string;
  areaCode: string;
  lat: string;
  lng: string;
  districts: string[];
};

const IRAN_CITIES: IranCity[] = [
  { province: 'تهران', city: 'تهران', citySlug: 'tehran', areaCode: '021', lat: '35.6892', lng: '51.3890', districts: ['ونک', 'پاسداران', 'صادقیه', 'تهرانپارس', 'سعادت‌آباد', 'فرشته', 'نارمک'] },
  { province: 'اصفهان', city: 'اصفهان', citySlug: 'isfahan', areaCode: '031', lat: '32.6539', lng: '51.6660', districts: ['چهارباغ', 'مرداویج', 'شیخ صدوق', 'خانه اصفهان'] },
  { province: 'خراسان رضوی', city: 'مشهد', citySlug: 'mashhad', areaCode: '051', lat: '36.2605', lng: '59.6168', districts: ['سجاد', 'احمدآباد', 'وکیل‌آباد', 'طرقبه'] },
  { province: 'فارس', city: 'شیراز', citySlug: 'shiraz', areaCode: '071', lat: '29.5918', lng: '52.5837', districts: ['معالی‌آباد', 'قصرالدشت', 'عفیف‌آباد'] },
  { province: 'البرز', city: 'کرج', citySlug: 'karaj', areaCode: '026', lat: '35.8400', lng: '50.9391', districts: ['عظیمیه', 'گوهردشت', 'مهرشهر'] },
];

const CENTER_NAMES = ['ولتاژ', 'پیکسل', 'ماتریکس', 'اینفینیتی', 'سایبر', 'نوآ', 'رادیکال', 'گیم‌لند', 'آرنا', 'تایتان'];
const CENTER_SUFFIXES = ['گیم‌سنتر', 'باشگاه بازی', 'مجتمع گیمینگ', 'مرکز تفریحی'];

const FIRST_NAMES_M = ['امیر', 'محمد', 'علی', 'رضا', 'مهدی', 'حسین', 'آرمان', 'سامان', 'پوریا', 'نیما', 'ارشیا', 'سپهر'];
const FIRST_NAMES_F = ['سارا', 'نسترن', 'مریم', 'الناز', 'تینا', 'غزل', 'نیلوفر', 'ساغر', 'رویا', 'بهار'];
const LAST_NAMES = ['حسینی', 'رضایی', 'محمدی', 'احمدی', 'کریمی', 'جعفری', 'مرادی', 'نوری', 'صادقی', 'زارع', 'قاسمی'];

const POPULAR_GAMES = [
  'Dota 2', 'Counter-Strike 2', 'League of Legends', 'FC 24', 'Call of Duty: Warzone',
  'Valorant', 'Rainbow Six Siege', 'PUBG', 'God of War Ragnarok', 'Spider-Man 2',
  'Elden Ring', 'Tekken 8', 'Mortal Kombat 1', 'Fortnite'
];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function chance(p: number) {
  return Math.random() < p;
}
function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-آ-ی]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function clearAll() {
  console.log('🧹 Clearing existing data...');
  // Delete in reverse order of dependencies
  await prisma.auditLog.deleteMany();
  await prisma.gamingSession.deleteMany();
  await prisma.stationMaintenance.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.earningPayment.deleteMany();
  await prisma.earning.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.staffStationSkill.deleteMany();
  await prisma.staffShift.deleteMany();
  await prisma.user.deleteMany();
  await prisma.gameStation.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.customerAccount.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.pageSection.deleteMany();
  await prisma.pageSlugHistory.deleteMany();
  await prisma.page.deleteMany();
  await prisma.media.deleteMany();
  await prisma.socialLink.deleteMany();
  await prisma.address.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.commissionPolicy.deleteMany();
  await prisma.gamingCenter.deleteMany();
  await prisma.session.deleteMany();
  await prisma.phoneOtp.deleteMany();
}

function makeIranMobileUnique(counter: number) {
  return `0912${String(counter).padStart(7, '0')}`.slice(0, 11);
}

async function main() {
  await clearAll();

  console.log('🏢 Seeding Gaming Centers...');
  const centerIds: string[] = [];
  for (let i = 0; i < CONFIG.gamingCentersCount; i++) {
    const city = IRAN_CITIES[i % IRAN_CITIES.length];
    const name = `${pick(CENTER_NAMES)} ${pick(CENTER_SUFFIXES)} ${city.city}`;
    const slug = `center-${i + 1}`;

    const center = await prisma.gamingCenter.create({
      data: {
        name,
        slug,
        isActive: true,
        description: `بزرگترین و مجهزترین مرکز بازی در ${city.city} با سیستم‌های بروز و محیطی دوستانه.`,
        pcCount: randInt(10, 30),
        consoleCount: randInt(5, 15),
        openingTime: '10:00',
        closingTime: '23:59',
        hourlyRate: 50000,
        vipHourlyRate: 80000,
        hasFoodService: true,
        games: shuffle(POPULAR_GAMES).slice(0, 10),
        settings: {
          create: {
            preventOverlaps: true,
            allowOnlineBooking: true,
            onlineBookingAutoConfirm: false,
            requireOtpForPublicBooking: true,
            maxAdvanceBookingDays: 7,
          }
        },
        siteSettings: {
          create: {
            defaultSeoTitle: `${name} | رزرو آنلاین سیستم`,
            defaultSeoDescription: `رزرو آنلاین سیستم‌های گیمینگ و کنسول در ${name}`,
            robotsIndex: RobotsIndex.INDEX,
            robotsFollow: RobotsFollow.FOLLOW,
          }
        },
        commissionPolicy: {
          create: {
            type: CommissionType.PERCENT,
            percentBps: 500, // 5%
            isActive: true,
          }
        },
        addresses: {
          create: {
            city: city.city,
            province: city.province,
            district: pick(city.districts),
            addressLine: `خیابان ${pick(city.districts)}، پلاک ${randInt(1, 100)}`,
            isPrimary: true,
          }
        },
        links: {
          create: [
            { type: LinkType.INSTAGRAM, label: 'اینستاگرام', value: `@${slugify(name)}` },
            { type: LinkType.PHONE, label: 'تلفن', value: `${city.areaCode}${randInt(11111111, 99999999)}` },
          ]
        }
      }
    });
    centerIds.push(center.id);
  }

  console.log('👤 Seeding Staff Users...');
  const userIdsByCenter: Record<string, string[]> = {};
  const managerIdByCenter: Record<string, string> = {};

  for (const centerId of centerIds) {
    userIdsByCenter[centerId] = [];
    // 1 Manager
    const manager = await prisma.user.create({
      data: {
        gamingCenterId: centerId,
        fullName: `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
        phone: makeIranMobileUnique(randInt(1000000, 1999999)),
        role: UserRole.MANAGER,
        isActive: true,
        passwordHash: 'dummy_hash',
      }
    });
    managerIdByCenter[centerId] = manager.id;

    // 3 Staff
    for (let j = 0; j < 3; j++) {
      const staff = await prisma.user.create({
        data: {
          gamingCenterId: centerId,
          fullName: `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
          phone: makeIranMobileUnique(randInt(2000000, 3999999)),
          role: UserRole.STAFF,
          isActive: true,
          passwordHash: 'dummy_hash',
        }
      });
      userIdsByCenter[centerId].push(staff.id);

      // Shifts for staff
      for (let day = 0; day < 7; day++) {
        await prisma.staffShift.create({
          data: {
            gamingCenterId: centerId,
            userId: staff.id,
            dayOfWeek: day,
            startTime: '10:00',
            endTime: '22:00',
            shiftRole: pick([ShiftRole.CASHIER, ShiftRole.HOST, ShiftRole.TECH_SUPPORT]),
          }
        });
      }
    }
  }

  console.log('🖥️ Seeding Game Stations...');
  const stationsByCenter: Record<string, {id: string, hourlyPrice: number, name: string}[]> = {};
  for (const centerId of centerIds) {
    stationsByCenter[centerId] = [];
    const center = await prisma.gamingCenter.findUnique({ where: { id: centerId } });
    if (!center) continue;

    for (let i = 0; i < CONFIG.stationsPerCenter; i++) {
      const isVip = chance(0.2);
      const station = await prisma.gameStation.create({
        data: {
          gamingCenterId: centerId,
          name: i < 10 ? `PC-${i + 1}` : `PS5-${i - 9}`,
          stationType: i < 10 ? GameStationType.PC : GameStationType.PLAYSTATION,
          isVip,
          hourlyPrice: isVip ? (center.vipHourlyRate || 80000) : center.hourlyRate,
          isActive: true,
        }
      });
      stationsByCenter[centerId].push({ id: station.id, hourlyPrice: station.hourlyPrice, name: station.name });
    }
  }

  console.log('👥 Seeding Customers...');
  const customerAccountIds: string[] = [];
  for (let i = 0; i < CONFIG.totalCustomers; i++) {
    const account = await prisma.customerAccount.create({
      data: {
        fullName: `${pick([...FIRST_NAMES_M, ...FIRST_NAMES_F])} ${pick(LAST_NAMES)}`,
        phone: makeIranMobileUnique(randInt(7000000, 8999999)),
        walletBalance: randInt(0, 200000),
      }
    });
    customerAccountIds.push(account.id);

    // Profile in random center
    const centerId = pick(centerIds);
    await prisma.customerProfile.create({
      data: {
        gamingCenterId: centerId,
        customerAccountId: account.id,
        displayName: account.fullName,
      }
    });
  }

  console.log('📅 Seeding Reservations & Payments...');
  for (const centerId of centerIds) {
    const centerStations = stationsByCenter[centerId];
    const centerStaff = userIdsByCenter[centerId];
    const managerId = managerIdByCenter[centerId];
    const profiles = await prisma.customerProfile.findMany({ where: { gamingCenterId: centerId } });

    if (profiles.length === 0) continue;

    for (let i = 0; i < CONFIG.bookingsPerCenter; i++) {
      const profile = pick(profiles);
      const station = pick(centerStations);
      const staffId = pick(centerStaff);

      const startTime = new Date();
      startTime.setHours(randInt(10, 20), pick([0, 30]), 0, 0);
      startTime.setDate(startTime.getDate() + randInt(-7, 7));

      const hours = randInt(1, 4);
      const endTime = new Date(startTime.getTime() + hours * 3600000);
      const totalPrice = station.hourlyPrice * hours;

      const isPast = startTime < new Date();
      const status = isPast ? ReservationStatus.COMPLETED : ReservationStatus.CONFIRMED;

      const reservation = await prisma.reservation.create({
        data: {
          gamingCenterId: centerId,
          customerProfileId: profile.id,
          customerAccountId: profile.customerAccountId,
          stationId: station.id,
          staffId,
          createdByUserId: managerId,
          startTime,
          endTime,
          totalHours: hours,
          totalPrice,
          status,
          source: pick([ReservationSource.ONLINE, ReservationSource.WALK_IN]),
          stationSnapshot: { name: station.name, price: station.hourlyPrice },
          paymentState: isPast ? ReservationPaymentState.PAID : ReservationPaymentState.PENDING,
        }
      });

      if (isPast) {
        await prisma.payment.create({
          data: {
            gamingCenterId: centerId,
            reservationId: reservation.id,
            amount: totalPrice,
            currency: 'IRT',
            method: pick([PaymentMethod.CASH, PaymentMethod.CARD]),
            status: PaymentStatus.PAID,
            paidAt: startTime,
          }
        });

        // Add a rating
        if (chance(0.5)) {
          await prisma.rating.create({
            data: {
              gamingCenterId: centerId,
              customerAccountId: profile.customerAccountId,
              reservationId: reservation.id,
              stationId: station.id,
              rating: randInt(4, 5),
              comment: 'عالی بود، سیستم‌ها خیلی قوی بودن.',
            }
          });
        }

        // Earning for center
        const commissionAmount = Math.round(totalPrice * 0.05);
        await prisma.earning.create({
          data: {
            reservationId: reservation.id,
            gamingCenterId: centerId,
            baseAmount: totalPrice,
            currency: 'IRT',
            type: CommissionType.PERCENT,
            percentBps: 500,
            commissionAmount,
            status: CommissionStatus.ACCRUED,
          }
        });
      }
    }
  }

  console.log('🏆 Seeding Tournaments...');
  for (const centerId of centerIds) {
    await prisma.tournament.create({
      data: {
        gamingCenterId: centerId,
        title: `مسابقات ${pick(POPULAR_GAMES)}`,
        gameName: pick(POPULAR_GAMES),
        startTime: new Date(Date.now() + 7 * 24 * 3600000),
        description: 'جایزه نفر اول: ۱ میلیون تومان اعتبار بازی',
        prizePool: '۵ میلیون تومان',
        maxParticipants: 32,
      }
    });
  }

  console.log('📄 Seeding Pages...');
  for (const centerId of centerIds) {
    const center = await prisma.gamingCenter.findUnique({ where: { id: centerId } });
    if (!center) continue;

    await prisma.page.create({
      data: {
        gamingCenterId: centerId,
        slug: 'home',
        title: 'صفحه اصلی',
        type: PageType.HOME,
        status: PageStatus.PUBLISHED,
        sections: {
          create: [
            {
              type: PageSectionType.HERO,
              dataJson: JSON.stringify({ title: `خوش آمدید به ${center.name}`, subtitle: 'بهترین تجربه گیمینگ' }),
              sortOrder: 0,
            },
            {
              type: PageSectionType.FAQ,
              dataJson: JSON.stringify({ questions: [{ q: 'آیا رزرو آنلاین اجباری است؟', a: 'خیر، ولی اولویت با رزرو آنلاین است.' }] }),
              sortOrder: 1,
            }
          ]
        }
      }
    });
  }

  console.log('✅ Professional Seed Completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
