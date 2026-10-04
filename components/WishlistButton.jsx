'use client'

import { Heart } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function WishlistButton({ product }) {
  const { toggleWishlist, isWishlisted } = useCart()
  const wishlisted = isWishlisted(product.id)

  return (
    <button
      onClick={() => toggleWishlist(product)}
      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow ${
        wishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-600'
      }`}
      aria-label="Wishlist"
    >
      <Heart size={14} fill={wishlisted ? 'currentColor' : 'none'} />
    </button>
  )
}