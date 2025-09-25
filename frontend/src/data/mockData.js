// Mock data for demonstration
export const mockFoodItems = [
  { id: 1, name: "Margherita Pizza", price: 12.99, category: "Pizza", image: "/api/placeholder/200/150", description: "Fresh tomatoes, mozzarella, basil" },
  { id: 2, name: "Chicken Burger", price: 9.99, category: "Burgers", image: "/api/placeholder/200/150", description: "Grilled chicken with lettuce and tomato" },
  { id: 3, name: "Caesar Salad", price: 8.99, category: "Salads", image: "/api/placeholder/200/150", description: "Romaine lettuce, croutons, parmesan" },
  { id: 4, name: "Pasta Carbonara", price: 11.99, category: "Pasta", image: "/api/placeholder/200/150", description: "Creamy pasta with bacon and eggs" }
];

export const mockOrders = [
  { id: 1, table: 5, items: ["Margherita Pizza", "Caesar Salad"], total: 21.98, status: "pending", time: "2025-01-15T10:30:00Z" },
  { id: 2, table: 3, items: ["Chicken Burger"], total: 9.99, status: "completed", time: "2025-01-15T09:45:00Z" },
  { id: 3, table: 8, items: ["Pasta Carbonara", "Caesar Salad"], total: 20.98, status: "pending", time: "2025-01-15T11:15:00Z" }
];