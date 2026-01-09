const prisma = require('../src/db');

async function fixUserRole() {
    try {
        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: 'fundagungen7@gmail.com' },
            include: { roles: { include: { role: true } } }
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('Current user:', user.email);
        console.log('Current roles:', user.roles.map(r => r.role.name));

        // Find instructor role
        const instructorRole = await prisma.role.findUnique({
            where: { name: 'instructor' }
        });

        if (!instructorRole) {
            console.log('Instructor role not found');
            return;
        }

        // Check if already has instructor role
        const hasInstructor = user.roles.some(r => r.role.name === 'instructor');

        if (!hasInstructor) {
            // Add instructor role
            await prisma.userRole.create({
                data: {
                    userId: user.id,
                    roleId: instructorRole.id
                }
            });
            console.log('Added instructor role to user');
        } else {
            console.log('User already has instructor role');
        }

        // Verify
        const updated = await prisma.user.findUnique({
            where: { email: 'fundagungen7@gmail.com' },
            include: { roles: { include: { role: true } } }
        });
        console.log('Updated roles:', updated.roles.map(r => r.role.name));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixUserRole();
