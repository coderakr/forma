import { connectDatabase, closeDatabase, authMongo } from './config/database.js';
import { parseSeedEnv } from './config/env.js';
import { auth } from './lib/auth.js';
import { Category, Product, ensureIndexes } from './models/index.js';
import { logger } from './lib/logger.js';
const seed = parseSeedEnv();
const photo = (id: string, width = 900) =>
  `${seed.IMAGE_BASE_URL}/${id}?auto=format&fit=crop&w=${width}&q=85`;
const categories = [
  {
    name: 'Living',
    slug: 'living',
    description: 'Make yourself at home.',
    image: photo('photo-1600210492486-724fe5c67fb0'),
  },
  {
    name: 'Lighting',
    slug: 'lighting',
    description: 'A softer way to see things.',
    image: photo('photo-1507473885765-e6ed057f782c'),
  },
  {
    name: 'Objects',
    slug: 'objects',
    description: 'Little things. Lovely details.',
    image: photo('photo-1578749556568-bc2c40e68b61'),
  },
  {
    name: 'Textiles',
    slug: 'textiles',
    description: 'A little comfort goes a long way.',
    image: photo('photo-1584100936595-c0654b55a2e2'),
  },
];
// Prices are authored in rupees for readability here, then converted to integer paise.
const pieces: [string, string, number, string, string, string][] = [
  [
    'The Sunday Lounge Chair',
    'living',
    14900,
    'photo-1567538096630-e0c55bd6374c',
    'Solid ash & woven cotton',
    '72 × 78 × 82 cm',
  ],
  [
    'Arc Oak Side Table',
    'living',
    4900,
    'photo-1499933374294-4584851497cc',
    'Solid oak',
    '45 × 45 × 50 cm',
  ],
  [
    'Everyday Accent Chair',
    'living',
    11900,
    'photo-1598300042247-d088f8ab3a91',
    'Oak & linen upholstery',
    '65 × 70 × 78 cm',
  ],
  [
    'Gather Round Coffee Table',
    'living',
    12900,
    'photo-1538688423619-a81d3f23454b',
    'Solid mango wood',
    '90 × 90 × 38 cm',
  ],
  [
    'Lowline Storage Console',
    'living',
    22900,
    'photo-1555041469-a586c61ea9bc',
    'Oak veneer & birch ply',
    '160 × 40 × 60 cm',
  ],
  [
    'The Slow Morning Bench',
    'living',
    8900,
    'photo-1616486338812-3dadae4b4ace',
    'Solid acacia',
    '110 × 35 × 45 cm',
  ],
  [
    'Nook Upholstered Ottoman',
    'living',
    5900,
    'photo-1615874959474-d609969a20ed',
    'Cotton boucle & oak',
    '50 × 50 × 42 cm',
  ],
  [
    'Lean Oak Wall Shelf',
    'living',
    2900,
    'photo-1594620302200-9a762244a156',
    'Solid oak',
    '80 × 20 × 18 cm',
  ],
  [
    'Mushroom Table Lamp',
    'lighting',
    3490,
    'photo-1507473885765-e6ed057f782c',
    'Powder-coated steel',
    '28 × 28 × 35 cm',
  ],
  [
    'Paper Moon Pendant',
    'lighting',
    2990,
    'photo-1513506003901-1e6a229e2d15',
    'Rice paper & steel',
    '45 × 45 × 40 cm',
  ],
  [
    'Dusk Ceramic Table Lamp',
    'lighting',
    4490,
    'photo-1543198126-a8ad8e47fb22',
    'Ceramic & linen',
    '30 × 30 × 48 cm',
  ],
  [
    'Line Reading Floor Lamp',
    'lighting',
    6490,
    'photo-1507473885765-e6ed057f782c',
    'Brushed steel',
    '35 × 35 × 145 cm',
  ],
  [
    'Halo Wall Light',
    'lighting',
    2490,
    'photo-1513506003901-1e6a229e2d15',
    'Brass & opal glass',
    '20 × 15 × 26 cm',
  ],
  [
    'Woven Rattan Pendant',
    'lighting',
    3990,
    'photo-1543198126-a8ad8e47fb22',
    'Natural rattan',
    '40 × 40 × 32 cm',
  ],
  [
    'Pebble Bedside Light',
    'lighting',
    1990,
    'photo-1507473885765-e6ed057f782c',
    'Frosted glass',
    '18 × 18 × 22 cm',
  ],
  [
    'Evening Glow Desk Lamp',
    'lighting',
    2790,
    'photo-1513506003901-1e6a229e2d15',
    'Painted metal',
    '20 × 20 × 38 cm',
  ],
  [
    'Everyday Ceramic Mug',
    'objects',
    790,
    'photo-1514228742587-6b1558fcca3d',
    'Glazed stoneware',
    '350 ml',
  ],
  [
    'Still Life Bud Vase',
    'objects',
    1290,
    'photo-1578749556568-bc2c40e68b61',
    'Hand-finished ceramic',
    '12 × 12 × 24 cm',
  ],
  [
    'Gather Serving Bowl',
    'objects',
    1790,
    'photo-1490312278390-ab64016e0aa9',
    'Glazed stoneware',
    '26 × 26 × 9 cm',
  ],
  [
    'Little Rituals Pour-Over',
    'objects',
    2490,
    'photo-1514228742587-6b1558fcca3d',
    'Stoneware & oak',
    '600 ml',
  ],
  [
    'Organic Ceramic Planter',
    'objects',
    1490,
    'photo-1485955900006-10f4d324d411',
    'Unglazed terracotta',
    '20 × 20 × 22 cm',
  ],
  [
    'The Catch-All Tray',
    'objects',
    990,
    'photo-1578749556568-bc2c40e68b61',
    'Solid acacia',
    '28 × 16 × 3 cm',
  ],
  [
    'Form Glass Carafe',
    'objects',
    1190,
    'photo-1490312278390-ab64016e0aa9',
    'Borosilicate glass',
    '1 litre',
  ],
  [
    'Quiet Hours Candle Holder',
    'objects',
    690,
    'photo-1603006905003-be475563bc59',
    'Brushed brass',
    '8 × 8 × 18 cm',
  ],
  [
    'Soft Landing Linen Cushion',
    'textiles',
    1490,
    'photo-1584100936595-c0654b55a2e2',
    'Washed linen',
    '45 × 45 cm',
  ],
  [
    'Slow Sunday Cotton Throw',
    'textiles',
    2490,
    'photo-1600166898405-da9535204843',
    'Woven organic cotton',
    '130 × 170 cm',
  ],
  [
    'Morning Light Table Runner',
    'textiles',
    990,
    'photo-1600166898405-da9535204843',
    'Linen & cotton',
    '35 × 180 cm',
  ],
  [
    'Everyday Waffle Towel Set',
    'textiles',
    1790,
    'photo-1620626011761-996317b8d101',
    'Waffle cotton',
    '70 × 140 cm, set of 2',
  ],
  [
    'Grounded Jute Rug',
    'textiles',
    4990,
    'photo-1600166898405-da9535204843',
    'Natural jute',
    '120 × 180 cm',
  ],
  [
    'Cloud Boucle Cushion',
    'textiles',
    1890,
    'photo-1584100936595-c0654b55a2e2',
    'Cotton boucle',
    '50 × 50 cm',
  ],
  [
    'Sunday Stripes Napkin Set',
    'textiles',
    890,
    'photo-1600166898405-da9535204843',
    'Organic cotton',
    '40 × 40 cm, set of 4',
  ],
  [
    'Rest Easy Linen Throw',
    'textiles',
    3290,
    'photo-1584100936595-c0654b55a2e2',
    'Stonewashed linen',
    '140 × 200 cm',
  ],
];
try {
  await connectDatabase();
  await ensureIndexes();
  for (const category of categories)
    await Category.updateOne({ slug: category.slug }, { $setOnInsert: category }, { upsert: true });
  for (const [index, [name, category, rupees, image, material, dimensions]] of pieces.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await Product.updateOne(
      { slug },
      {
        $setOnInsert: {
          name,
          slug,
          category,
          description: `A considered addition to your everyday. ${name} brings a natural sense of warmth and balance to your space. Made with ${material.toLowerCase()}, with thoughtful proportions and a finish that feels as good as it looks. A piece to enjoy, day after day.`,
          price: rupees * 100,
          compareAtPrice: index % 5 === 0 ? (rupees + 600) * 100 : 0,
          stock: 8 + ((index * 3) % 35),
          images: [photo(image), photo(image, 1200)],
          variants:
            category === 'lighting'
              ? ['Warm white', 'Olive']
              : category === 'textiles'
                ? ['Oat', 'Sage', 'Terracotta']
                : ['Natural', 'Warm white'],
          material,
          dimensions,
          featured: [0, 8, 16, 24].includes(index),
          active: true,
          createdAt: new Date(Date.now() - index * 60000),
        },
      },
      { upsert: true },
    );
  }
  const users = authMongo.db().collection('user');
  if (!(await users.findOne({ email: seed.SEED_ADMIN_EMAIL.toLowerCase() })))
    await auth.api.signUpEmail({
      body: {
        name: 'Forma Studio',
        email: seed.SEED_ADMIN_EMAIL,
        password: seed.SEED_ADMIN_PASSWORD,
      },
    });
  await users.updateOne(
    { email: seed.SEED_ADMIN_EMAIL.toLowerCase() },
    { $set: { role: 'admin', emailVerified: true } },
  );
  logger.info(
    { products: pieces.length, categories: categories.length },
    'Seed complete. Admin credentials are in your backend environment. Existing catalog data was preserved.',
  );
} finally {
  await closeDatabase();
}
