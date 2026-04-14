require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const connectDB = require('../config/db');

const sampleProducts = [
  { title: 'boAt Rockerz 450 Pro Bluetooth Headphone', description: 'Immersive sound with 40mm dynamic drivers and 70 hours battery life.', price: 1299, originalPrice: 3990, discount: 67, category: 'Electronics', brand: 'boAt', stock: 50, badge: 'Best Seller', rating: 4.3, numReviews: 48291, images: [{ url: '/images/headphone.jpg', alt: 'boAt Headphone' }] },
  { title: 'Apple iPhone 15 128GB Midnight Blue', description: 'iPhone 15 with A16 Bionic chip, 48MP camera and USB-C.', price: 74999, originalPrice: 79900, discount: 6, category: 'Smartphones', brand: 'Apple', stock: 20, badge: null, rating: 4.6, numReviews: 23451, images: [{ url: '/images/iphone15.jpg', alt: 'iPhone 15' }] },
  { title: 'Samsung 43" 4K Ultra HD Smart LED TV', description: '43-inch Crystal 4K UHD display with Smart Hub and Alexa built-in.', price: 31999, originalPrice: 54999, discount: 42, category: 'Electronics', brand: 'Samsung', stock: 15, badge: 'Hot Deal', rating: 4.5, numReviews: 12847, images: [{ url: '/images/samsung-tv.jpg', alt: 'Samsung TV' }] },
  { title: 'Apple MacBook Air M2 8GB/256GB', description: 'MacBook Air with M2 chip, 13.6-inch Liquid Retina display and 18-hour battery.', price: 99900, originalPrice: 119900, discount: 17, category: 'Laptops', brand: 'Apple', stock: 10, badge: 'Best Seller', rating: 4.7, numReviews: 6721, images: [{ url: '/images/macbook-air.jpg', alt: 'MacBook Air M2' }] },
  { title: 'Nike Air Max 270 Running Shoes', description: 'Max Air unit in the heel for unrivalled, all-day comfort.', price: 5495, originalPrice: 10995, discount: 50, category: 'Footwear', brand: 'Nike', stock: 8, badge: 'Limited', rating: 4.2, numReviews: 8932, images: [{ url: '/images/nike-shoes.jpg', alt: 'Nike Air Max 270' }] },
  { title: 'JBL Charge 5 Portable Bluetooth Speaker', description: 'Powerful audio, IP67 waterproof, 20 hours of playtime.', price: 11999, originalPrice: 19999, discount: 40, category: 'Audio', brand: 'JBL', stock: 25, badge: 'Best Seller', rating: 4.4, numReviews: 15678, images: [{ url: '/images/jbl-speaker.jpg', alt: 'JBL Charge 5' }] },
];

const adminUser = {
  name: 'Admin User',
  email: 'admin@ecommerce.com',
  password: 'Admin@1234',
  role: 'admin',
};

async function seed() {
  await connectDB();
  console.log('\n🌱 Seeding database...\n');

  try {
    await Product.deleteMany({});
    await User.deleteMany({ role: 'admin' });

    const products = await Product.insertMany(sampleProducts);
    console.log(`✅ ${products.length} products seeded`);

    await User.create(adminUser);
    console.log('✅ Admin user created — admin@ecommerce.com / Admin@1234');

    console.log('\n🎉 Seeding complete!\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

seed();
