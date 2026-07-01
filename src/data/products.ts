export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  badge?: string;
}

export const products: Product[] = [
  {
    id: "p1",
    brand: "Aurum Botanics",
    name: "Restorative Hair Oil - Argan 50ml",
    price: 850.00,
    badge: "Envío Gratis",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuATGMbZ7t31Sb0Myew26iAb9JSr892izi0kF6yeb4Qrp2DwOGu7IE1GkrMhLk_-h6tLLKa5-Y2THx5rgchpfFcSvK630quyCPIJ4LoBXOjbrfQ4uUm1NzGgK9oAjuR0QD90c8asy15OXxYST7j-st4M3oUfATM8KB5ALb21zcC1kJ6OgFSNjQQG8iZzWJ0An9LC9rlgL9z-NL7MlcXE9HGozUvM2M2RTpaBnAC9b9cF9_i-rlmrGmXaxRgihWFfEyuCdDUL_wD4kbs"
  },
  {
    id: "p2",
    brand: "ProTools Beauty",
    name: "Secadora Profesional Iónica Negro Mate",
    price: 2450.00,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDPlKbe77Ua_wnGV3AwxqHKqjHOKb-13K_Gabfiu7kArIiovsuudRVkJChhnwjencCZA8JWrVGKY-K4Q3wZqmnH9LGNWsDKML9I_k8w2KUM7tWrFo2C1xv9QNEIJ4rJV3gly1xHr2CDTWVujD0cJRPTN2bz-HQ8BoDkx4KaJIn30dr1gH-2WO-oD9Wxhq2aKN19M4jCQIk-91EI27v25kBIZW_bGxLDpSzEarnl1-OVSBfO0YfhyPjxrZkFkTj7YfpWsIKMDZwg5eM"
  },
  {
    id: "p3",
    brand: "NailTech Pro",
    name: "Colección Esmaltes Gel Gold - 12 Pzas",
    price: 1200.00,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDUAN864bVhfFJibi_gNJ4FFW5krGunsWIGcjE1cJ_Q1L8vwMoCqDMwHopnZkrL_j0qvF5PctuSfhZ7b1-CPFrsyXgOm44KKd3KmzLXL8KMUU0enaULGHTHoSd40yFUdXbBroF_t_gA1O33jT-Y3gZYbGq12meBSstduldU-NDq_omxyNbDZsW0ivNRAss3Rmubj62sPtffJ5V8x2UueWraVM5mHGhUOZ-DMhlcgTZQxTm06fKih8d7gFm7qQ3q3sOMNdupEMMDNWI"
  },
  {
    id: "p4",
    brand: "LashLuxury",
    name: "Kit Profesional Pinzas Precisión Oro",
    price: 680.00,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAuZaHeO-CvoRWMj_slAp00fv-Tz3BzwBank3eLrTuJcoZYAPt9d9r2SGpI84-xD39JV-H5SJUtqJPWci30P1QY3c8wL_4PZq0ums49cf5GvaBYRciq6ZeuF2mvncs0h1zScb_nh9W2TQAtPpC2te1IrEoSj37J4eNcLstfC3DSKGBN2731ADq1KRQcQzFid36VMYlOvsjCzg5lpA3aXDXNJVHZeSf9VdR-pR5jDnjxIYoyNDjY2Z10-GVTH3t83z-jOvWI7xb_xxs"
  }
];
