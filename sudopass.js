const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = 'trinetra';
  const passwordPlain = 'tnt';
  const phone = '9106413819';
  const email = 'yashtalaviya000@gmail.com';

  // Bcrypt hash
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  // Permissions object
  const permissions = {
    viewProfile: true,
    editUsername: true,
    editMailID: true,
    editNumber: true,
    editProfilePic: true,

    viewDashboard: true,

    viewForms: true,
    createForms: true,
    createFormAVF: true,
    createFormBGV: true,
    deleteFormLinks: true,

    viewResponses: true,
    deleteResponses: true,
    downloadResponses: true,

    viewUsers: true,
    createUser: true,
    editUser: true,
    deleteUser: true,
    loginAsUser: true
  };

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { username }
  });

  if (existing) {
    console.log('User already exists!');
    return;
  }

  // Create user with phone number
  const user = await prisma.user.create({
    data: {
      username,
      email,
      phone,           // <<=== Phone number yahan add kiya hai
      password: passwordHash,
      role: 'SUDO',
      permissions
    }
  });

  console.log('SUDO user created:', user);
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
