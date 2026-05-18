const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const imageMapping = {
  "Rice 25kg": "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=600",
  "Cooking Oil 5L": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=600",
  "Sugar 1kg": "https://images.unsplash.com/photo-1581448670548-41712433f1b9?q=80&w=600",
  "Beans 1kg": "https://images.unsplash.com/photo-1551462147-37885acc3c41?q=80&w=600",
  "Maize Flour 1kg": "https://images.unsplash.com/photo-1590127221120-003613054a8a?q=80&w=600",
  "Bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600",
  "Milk 1L": "https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=600",
  "Eggs (12)": "https://cdn.pixabay.com/photo/2016/12/17/14/33/eggs-1913503_960_720.jpg",
  "Soap": "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?q=80&w=600",
  "Beans 1kg": "https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg?auto=compress&cs=tinysrgb&w=600"
};

async function updateImages() {
  try {
    console.log('🚀 Updating product images...');
    
    for (const [name, imageUrl] of Object.entries(imageMapping)) {
      const result = await prisma.product.updateMany({
        where: { name: { contains: name } },
        data: { image: imageUrl }
      });
      console.log(`✅ Updated ${name}: ${result.count} record(s)`);
    }

    console.log('\n✨ All images updated successfully!');
  } catch (err) {
    console.error('❌ Error updating images:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateImages();
