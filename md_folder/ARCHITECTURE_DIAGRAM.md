# System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HYBRID LICENSING SYSTEM ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER SIGNUP FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

    User
      │
      ├─► POST /api/auth/signup
      │   { restaurantName, email, password }
      │
      ▼
  ┌─────────────────┐
  │  Auth Route     │
  │  (auth.js)      │
  └────────┬────────┘
           │
           ├─► 1. Create Restaurant
           │   ┌──────────────────────────────┐
           │   │ licenseType: "subscription"  │
           │   │ plan: "trial"                │
           │   │ subscriptionEndsAt: +14 days │
           │   │ isActive: true               │
           │   └──────────────────────────────┘
           │
           ├─► 2. Create Owner User
           │   ┌──────────────────────────────┐
           │   │ email: user@example.com      │
           │   │ passwordHash: hashed         │
           │   │ role: "owner"                │
           │   │ restaurantId: <restaurant>   │
           │   └──────────────────────────────┘
           │
           └─► 3. Generate JWT
               ┌──────────────────────────────┐
               │ userId: <user_id>            │
               │ restaurantId: <restaurant_id>│
               │ role: "owner"                │
               └──────────────────────────────┘
                        │
                        ▼
                   Return Token


┌─────────────────────────────────────────────────────────────────────────────┐
│                         LICENSE ENFORCEMENT FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

    User Request
      │
      ├─► GET /api/dashboard/stats
      │   Authorization: Bearer <token>
      │
      ▼
  ┌─────────────────────────┐
  │ authenticateToken       │
  │ (Verify JWT)            │
  └───────────┬─────────────┘
              │
              ├─► Extract: { userId, restaurantId, role }
              │
              ▼
  ┌─────────────────────────┐
  │ enforceLicense          │
  │ (Check License)         │
  └───────────┬─────────────┘
              │
              ├─► Load Restaurant by restaurantId
              │
              ▼
         ┌─────────┐
         │ Active? │
         └────┬────┘
              │
         ┌────┴────┐
         │   NO    │──► 403 "Restaurant deactivated"
         └─────────┘
              │
         ┌────┴────┐
         │   YES   │
         └────┬────┘
              │
              ▼
      ┌───────────────┐
      │ License Type? │
      └───────┬───────┘
              │
      ┌───────┴────────┐
      │                │
   LIFETIME      SUBSCRIPTION
      │                │
      │                ├─► Check subscriptionEndsAt
      │                │
      │                ▼
      │           ┌─────────┐
      │           │ Expired?│
      │           └────┬────┘
      │                │
      │           ┌────┴────┐
      │           │   YES   │──► 403 "Subscription expired"
      │           └─────────┘
      │                │
      │           ┌────┴────┐
      │           │   NO    │
      │           └────┬────┘
      │                │
      └────────┬───────┘
               │
               ▼
         ✅ ALLOW ACCESS
               │
               ├─► req.user = { userId, restaurantId, role }
               ├─► req.restaurant = <restaurant_doc>
               │
               ▼
         Route Handler


┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA ISOLATION PATTERN                              │
└─────────────────────────────────────────────────────────────────────────────┘

  Route Handler
      │
      ├─► Extract restaurantId from req.user
      │
      ▼
  const restaurantId = req.user.restaurantId;
      │
      ├─► Query Database with restaurantId filter
      │
      ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ await Order.find({ restaurantId, status: 'pending' })       │
  │                                                              │
  │ ✅ Only returns orders for THIS restaurant                  │
  │ ❌ Cannot access other restaurants' data                    │
  └─────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE COLLECTIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐
  │   Restaurants    │
  ├──────────────────┤
  │ _id              │◄──────────┐
  │ name             │           │
  │ licenseType      │           │
  │ plan             │           │
  │ subscriptionEnds │           │
  │ isActive         │           │
  └──────────────────┘           │
                                 │
                                 │ restaurantId
                                 │
  ┌──────────────────┐           │
  │      Users       │           │
  ├──────────────────┤           │
  │ _id              │           │
  │ email            │           │
  │ passwordHash     │           │
  │ role             │           │
  │ restaurantId     │───────────┤
  └──────────────────┘           │
                                 │
  ┌──────────────────┐           │
  │    FoodItems     │           │
  ├──────────────────┤           │
  │ _id              │           │
  │ name             │           │
  │ price            │           │
  │ restaurantId     │───────────┤
  └──────────────────┘           │
                                 │
  ┌──────────────────┐           │
  │     Orders       │           │
  ├──────────────────┤           │
  │ _id              │           │
  │ table            │           │
  │ items            │           │
  │ total            │           │
  │ restaurantId     │───────────┤
  └──────────────────┘           │
                                 │
  ┌──────────────────┐           │
  │  SalesHistory    │           │
  ├──────────────────┤           │
  │ _id              │           │
  │ date             │           │
  │ revenue          │           │
  │ restaurantId     │───────────┤
  └──────────────────┘           │
                                 │
  ┌──────────────────┐           │
  │  MonthlySales    │           │
  ├──────────────────┤           │
  │ _id              │           │
  │ year             │           │
  │ month            │           │
  │ totalSales       │           │
  │ restaurantId     │───────────┘
  └──────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                          LICENSE TYPES COMPARISON                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │                          SUBSCRIPTION                                │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │  Plans:                                                              │
  │    • Trial (14 days) - Default for new signups                      │
  │    • Monthly (30 days)                                               │
  │    • Yearly (365 days)                                               │
  │                                                                      │
  │  Validation:                                                         │
  │    ✅ Allow if: subscriptionEndsAt >= today                         │
  │    ❌ Block if: subscriptionEndsAt < today                          │
  │                                                                      │
  │  Fields:                                                             │
  │    licenseType: "subscription"                                       │
  │    plan: "trial" | "monthly" | "yearly"                             │
  │    subscriptionEndsAt: Date                                          │
  │                                                                      │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │                            LIFETIME                                  │
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │  Plans:                                                              │
  │    • None (one-time payment)                                         │
  │                                                                      │
  │  Validation:                                                         │
  │    ✅ Always allow (if restaurant is active)                        │
  │                                                                      │
  │  Fields:                                                             │
  │    licenseType: "lifetime"                                           │
  │    plan: null                                                        │
  │    subscriptionEndsAt: null                                          │
  │                                                                      │
  └─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN OPERATIONS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  List Restaurants
      │
      └─► GET /api/admin/restaurants
          Returns all restaurants with license status

  Convert to Lifetime
      │
      └─► POST /api/admin/convert-to-lifetime
          { restaurantId }
          ├─► Set licenseType = "lifetime"
          ├─► Set plan = null
          └─► Set subscriptionEndsAt = null

  Extend Subscription
      │
      └─► POST /api/admin/extend-subscription
          { restaurantId, days }
          └─► Add days to subscriptionEndsAt

  Deactivate Restaurant
      │
      └─► POST /api/admin/deactivate-restaurant
          { restaurantId }
          └─► Set isActive = false
              (Blocks ALL access)

  Activate Restaurant
      │
      └─► POST /api/admin/activate-restaurant
          { restaurantId }
          └─► Set isActive = true

  Change Plan
      │
      └─► POST /api/admin/change-plan
          { restaurantId, plan }
          └─► Set plan = "trial" | "monthly" | "yearly"


┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  Layer 1: JWT Authentication
      │
      └─► Verifies token is valid and not expired

  Layer 2: License Enforcement
      │
      └─► Checks if restaurant has valid license

  Layer 3: Data Isolation
      │
      └─► All queries filter by restaurantId

  Layer 4: Restaurant Active Status
      │
      └─► Checks if restaurant.isActive === true


┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  1. Signup → Creates trial (14 days)
      │
      ▼
  2. Login → Get JWT token
      │
      ▼
  3. Access protected route → ✅ Allowed (trial active)
      │
      ▼
  4. Convert to lifetime → Admin endpoint
      │
      ▼
  5. Access protected route → ✅ Allowed (lifetime)
      │
      ▼
  6. Deactivate restaurant → Admin endpoint
      │
      ▼
  7. Access protected route → ❌ Blocked (deactivated)
      │
      ▼
  8. Reactivate restaurant → Admin endpoint
      │
      ▼
  9. Access protected route → ✅ Allowed (reactivated)
```
