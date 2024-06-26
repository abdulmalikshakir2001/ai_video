const { faker } = require('@faker-js/faker');
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
const { hash } = require('bcryptjs');
const { randomUUID } = require('crypto');
const { addMonths } = require('date-fns');

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '123456789';
const ADMIN_NAME = 'admin';

async function seedUsers() {
  const newUsers: any[] = [];
  await createAdminUser();

  console.log('Seeded users', newUsers.length);

  return newUsers;

  async function createAdminUser() {
    const email = ADMIN_EMAIL;
    try {
      const originalPassword = ADMIN_PASSWORD;
      const password = await hash(originalPassword, 12);
      const user = await client.user.create({
        data: {
          email,
          name: ADMIN_NAME,
          password,
          emailVerified: new Date(),
          user_type: 'ADMIN',
        },
      });
      newUsers.push({
        ...user,
        password: originalPassword,
      });
    } catch (ex: any) {
      if (ex.message.indexOf('Unique constraint failed') > -1) {
        console.error('Duplicate email', email);
      } else {
        console.log(ex);
      }
    }
  }
}

async function seedTeams() {
  const newTeams: any[] = [];

  await Promise.all(
    Array(5)
      .fill(0)
      .map(() => createRandomTeam())
  );
  console.log('Seeded teams', newTeams.length);
  return newTeams;

  async function createRandomTeam() {
    const name = faker.company.name();
    const team = await client.team.create({
      data: {
        name,
        slug: name
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, ''),
      },
    });
    newTeams.push(team);
  }
}

async function seedTeamMembers(users: any[], teams: any[]) {
  const newTeamMembers: any[] = [];
  const roles = ['OWNER', 'MEMBER'];
  for (const user of users) {
    const count = Math.floor(Math.random() * 4) + 2;
    const teamUsed = new Set();
    for (let j = 0; j < count; j++) {
      try {
        let teamId;
        do {
          teamId = teams[Math.floor(Math.random() * teams.length)].id;
        } while (teamUsed.has(teamId));
        teamUsed.add(teamId);
        newTeamMembers.push({
          role: user.email === ADMIN_EMAIL ? 'OWNER' : roles[Math.floor(Math.random() * roles.length)],
          teamId,
          userId: user.id,
        });
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  await client.teamMember.createMany({
    data: newTeamMembers,
  });
  console.log('Seeded team members', newTeamMembers.length);
}

async function seedInvitations(teams: any[], users: any[]) {
  const newInvitations: any[] = [];
  for (const team of teams) {
    const count = Math.floor(Math.random() * users.length) + 2;
    for (let j = 0; j < count; j++) {
      try {
        const invitation = await client.invitation.create({
          data: {
            teamId: team.id,
            invitedBy: users[Math.floor(Math.random() * users.length)].id,
            email: faker.internet.email(),
            role: 'MEMBER',
            sentViaEmail: true,
            token: randomUUID(),
            allowedDomains: [],
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        newInvitations.push(invitation);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded invitations', newInvitations.length);

  return newInvitations;
}

async function seedSubscriptionPackages() {
  const packages = [
    {
      price: 29,
      upload_video_limit: 10,
      generate_clips: 100,
      max_length_video: '00:45:00',
      total_min: 29 * 15,
      subscription_type: 'BASIC'
    },
    {
      price: 79,
      upload_video_limit: 30,
      generate_clips: 300,
      max_length_video: '02:00:00',
      total_min: 79 * 15,
      subscription_type: 'PRO'
    },
    {
      price: 189,
      upload_video_limit: 100,
      generate_clips: 1000,
      max_length_video: '03:00:00',
      total_min: 189 * 15,
      subscription_type: 'PREMIUM'
    },
  ];

  for (const pkg of packages) {
    const existingPackage = await client.subscriptionPackage.findFirst({
      where: {
        subscription_type: pkg.subscription_type,
      },
    });

    if (!existingPackage) {
      await client.subscriptionPackage.create({
        data: pkg,
      });
      console.log('Seeded subscription package', pkg);
    } else {
      console.log('Subscription package already exists', pkg);
    }
  }
}

async function seedSingleSubscription() {
  const firstUser = await client.user.findFirst();
  const firstPackage = await client.subscriptionPackage.findFirst();

  if (firstUser && firstPackage) {
    const existingSubscription = await client.subscriptions.findFirst({
      where: {
        user_id: firstUser.id,
        subscription_pkg_id: firstPackage.id,
      },
    });

    if (!existingSubscription) {
      const startDate = new Date();
      const endDate = addMonths(startDate, 1);

      await client.subscriptions.create({
        data: {
          subscription_pkg_id: firstPackage.id,
          user_id: firstUser.id,
          start_date: startDate,
          end_date: endDate,
          status: true,
        },
      });

      console.log(`Seeded subscription for user ${firstUser.email} with package ${firstPackage.subscription_type}`);
    } else {
      console.log(`Subscription already exists for user ${firstUser.email} with package ${firstPackage.subscription_type}`);
    }
  }
}

async function init() {
  await seedUsers();
  // const users = await client.user.findMany();
  // const teams = await seedTeams();
  // await seedTeamMembers(users, teams);
  // await seedInvitations(teams, users);
  await seedSubscriptionPackages();
  await seedSingleSubscription();
}
init();
