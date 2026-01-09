import prisma from '../config/database';

const categories = ['Vegetables', 'Fruits', 'Dairy', 'Grains', 'Meat', 'Bakery'];

const productNames = [
  'Tomato', 'Potato', 'Onion', 'Carrot', 'Cabbage', 'Spinach', 'Broccoli', 'Cauliflower',
  'Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Strawberry', 'Watermelon', 'Pineapple',
  'Milk', 'Cheese', 'Butter', 'Yogurt', 'Paneer', 'Cream',
  'Rice', 'Wheat', 'Oats', 'Quinoa', 'Barley',
  'Chicken', 'Mutton', 'Fish', 'Eggs',
  'Bread', 'Biscuits', 'Cake', 'Cookies'
];

async function seedProducts(count: number) {
  console.log(`Starting to seed ${count} products...`);

  const batchSize = 1000;
  const batches = Math.ceil(count / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const products = [];
    const currentBatchSize = Math.min(batchSize, count - batch * batchSize);

    for (let i = 0; i < currentBatchSize; i++) {
      const randomName = productNames[Math.floor(Math.random() * productNames.length)] || 'Product';
      const randomCategory = categories[Math.floor(Math.random() * categories.length)] || 'General';

      products.push({
        name: `${randomName} ${batch * batchSize + i + 1}`,
        description: `Fresh ${randomName.toLowerCase()} from local farms`,
        price: parseFloat((Math.random() * 500 + 10).toFixed(2)),
        category: randomCategory,
      });
    }

    await prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });

    console.log(`Batch ${batch + 1}/${batches} completed (${(batch + 1) * batchSize} products)`);
  }

  console.log(`Successfully seeded ${count} products!`);
}

async function main() {
  try {
    // Clear existing products
    await prisma.product.deleteMany({});
    console.log('Cleared existing products');

    // Seed 1 million products
    await seedProducts(1000000);

    const totalCount = await prisma.product.count();
    console.log(`Total products in database: ${totalCount}`);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
