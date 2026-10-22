export type Review = { author: string; stars: number; text: string };

export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  sale: boolean;
  image: string;
  /** Deliberately optional — one product ships without this key. See B04. */
  reviews?: Review[];
};

const swatch = (hex: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${hex}"/></svg>`,
  )}`;

export const PRODUCTS: Product[] = [
  {
    id: 'atta-5kg',
    name: 'Chakki Atta 5kg',
    price: 249,
    unit: 'bag',
    sale: true,
    image: swatch('#d9c9a3'),
    reviews: [
      { author: 'Meera', stars: 5, text: 'Rotis come out soft.' },
      { author: 'Anil', stars: 4, text: 'Good value.' },
    ],
  },
  {
    id: 'toor-dal-1kg',
    name: 'Toor Dal 1kg',
    price: 178,
    unit: 'pack',
    sale: false,
    image: swatch('#e0b25f'),
    reviews: [{ author: 'Kavya', stars: 4, text: 'Cooks fast.' }],
  },
  {
    id: 'mustard-oil-1l',
    name: 'Mustard Oil 1L',
    price: 205,
    unit: 'bottle',
    sale: true,
    image: swatch('#c8a415'),
    /* B04 — no reviews key at all; the product page assumes it exists */
  },
  {
    id: 'basmati-5kg',
    name: 'Basmati Rice 5kg',
    price: 640,
    unit: 'bag',
    sale: false,
    image: swatch('#efe6d2'),
    reviews: [{ author: 'Rohit', stars: 5, text: 'Long grain, great aroma.' }],
  },
  {
    id: 'tea-500g',
    name: 'Assam Tea 500g',
    price: 320,
    unit: 'pack',
    sale: true,
    image: swatch('#7a4a25'),
    reviews: [{ author: 'Divya', stars: 3, text: 'A bit strong for me.' }],
  },
  {
    id: 'ghee-1l',
    name: 'Desi Ghee 1L',
    price: 720,
    unit: 'jar',
    sale: false,
    image: swatch('#f2d17c'),
    reviews: [{ author: 'Sanjay', stars: 5, text: 'Authentic taste.' }],
  },
];

/** Coupons. SAVE50 has a genuine ₹500 minimum — that rule is correct behaviour (decoy D01). */
export const COUPONS: Record<string, { off: number; minOrder: number }> = {
  SAVE50: { off: 50, minOrder: 500 },
  FIRST10: { off: 10, minOrder: 0 },
};
