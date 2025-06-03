// File: scripts/grantSudoPermissions.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // SUDO user ke liye pure naye permissions (aapke according)
  const fullPermissions = {
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

  await prisma.user.update({
    where: { username: 'trinetra' }, // SUDO username, change if needed
    data: { permissions: fullPermissions }
  });

  console.log('✅ Granted ALL permissions to SUDO user');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
