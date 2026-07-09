# Winkget-Inventory & Winkget-Business Integration Implementation Plan

This implementation document details the technical steps, database updates, route definitions, and security policies required to integrate the **Winkget-Inventory** (Central Hub, port `5001`) with **Winkget-Business** (Storefront app, port `5000`).

---

## 1. Architecture & Authentication Setup

To secure communication between both Express servers, we will implement a Shared Secret JWT authentication mechanism.

### A. Shared Secret Configuration
Add the shared JWT secret to the environment variables (`.env`) of both projects:
```ini
# Shared secret for server-to-server calls
INTEGRATION_SHARED_SECRET=your_highly_secure_sha256_secret_key_here
```

### B. Authentication Middleware (`verifyInternalToken`)
Create an authentication middleware on both platforms to validate incoming requests from the peer server.

**Implementation (both backends):**
```javascript
const jwt = require('jsonwebtoken');

const verifyInternalToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.INTEGRATION_SHARED_SECRET);
    if (decoded.iss !== 'winkget_system') {
      return res.status(403).json({ error: 'Invalid token issuer' });
    }
    req.internalCaller = decoded.source;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired system token' });
  }
};
```

---

## 2. Step-by-Step Implementation Steps

### Step 1: User & Vendor Synchronization (Business ➔ Inventory)

When a vendor is approved or updated on the storefront (Winkget-Business), their profile must sync to the central inventory registry to permit logging in.

#### A. Trigger webhook in Business User model pre-save / controller hook:
```javascript
// Inside Winkget-Business vendor controller/model hook:
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function syncVendorToInventory(vendorUser) {
  const token = jwt.sign(
    { iss: 'winkget_system', source: 'winkget_business' }, 
    process.env.INTEGRATION_SHARED_SECRET, 
    { expiresIn: '5m' }
  );

  try {
    await axios.post('http://localhost:5001/api/vendor/users/sync', {
      sourceUserId: vendorUser._id,
      email: vendorUser.email,
      password: vendorUser.password, // hashed password for SSO verification
      storeName: vendorUser.storeName,
      ownerName: vendorUser.ownerName,
      phone: vendorUser.phone,
      isActive: vendorUser.isActive,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    console.error('Failed to sync vendor user to inventory:', error.message);
    // Queue synchronization retry if failed
  }
}
```

#### B. Receiver route in Winkget-Inventory:
* **Route**: `POST /api/vendor/users/sync`
* **Controller logic**:
  ```javascript
  // Inside Winkget-Inventory users sync handler
  exports.syncUser = async (req, res) => {
    const { sourceUserId, email, password, storeName, ownerName, phone, isActive } = req.body;
    try {
      let user = await User.findOne({ sourceUserId });
      if (!user) {
        user = new User({ sourceUserId, email, password, storeName, ownerName, phone, isActive });
      } else {
        user.email = email;
        user.password = password;
        user.storeName = storeName;
        user.ownerName = ownerName;
        user.phone = phone;
        user.isActive = isActive;
      }
      await user.save();
      return res.status(200).json({ success: true, message: 'Vendor user synced successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
  ```

---

### Step 2: Catalog Categories Sync (Inventory ➔ Business)

Categories and subcategories are managed inside the central Inventory Hub and pushed to the storefront.

#### A. DB Schema Updates in Winkget-Business:
* Ensure `Category` schema includes support for `customFormFields` validation.
* Ensure `Subcategory` schema includes `description` and `coverImage` defaults.

#### B. Category Sync Route in Winkget-Business:
* **Route**: `POST /api/catalog/categories/sync`
* **Controller logic**:
  ```javascript
  exports.syncCategory = async (req, res) => {
    const { sourceId, name, slug, isActive, sortOrder, icon, customFormEnabled, customFormFields } = req.body;
    try {
      let category = await Category.findOne({ sourceId });
      if (!category) {
        category = new Category({ sourceId, name, slug, isActive, sortOrder, icon, customFormEnabled, customFormFields });
      } else {
        category.name = name;
        category.slug = slug;
        category.isActive = isActive;
        category.sortOrder = sortOrder;
        category.icon = icon;
        category.customFormEnabled = customFormEnabled;
        category.customFormFields = customFormFields;
      }
      await category.save();
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
  ```

---

### Step 3: Product Publishing & Real-Time Stock Updates (Inventory ➔ Business)

Products published to the store or modified inside the Inventory Hub update storefront shop catalog listings.

#### A. DB Schema Updates in Winkget-Business:
Add the following field to `winkget_business.vendorproducts` collection schema:
```javascript
sourceRecordId: {
  type: mongoose.Schema.Types.ObjectId,
  default: null, // References the corresponding VendorProduct._id in winkget-inventory
  index: true
}
```

#### B. Publish Endpoint on Storefront (Winkget-Business):
* **Route**: `POST /api/vendor-products` (called when product is published from inventory)
* **Controller logic**:
  ```javascript
  exports.createPublishedProduct = async (req, res) => {
    const { sourceRecordId, productName, description, categoryLabel, image, price, oldPrice, inventory, moq, variantData, specifications, dietaryType } = req.body;
    try {
      const product = new VendorProduct({
        sourceRecordId,
        productName,
        description,
        categoryLabel,
        image,
        price,
        oldPrice,
        inventory,
        moq,
        variantData,
        specifications,
        dietaryType,
        sourcePlatform: 'winkget_inventory'
      });
      await product.save();
      return res.status(201).json({ success: true, productId: product._id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
  ```

#### C. Real-Time Stock Update on Storefront:
* **Route**: `PATCH /api/vendor-products/source/:sourceId/stock`
* **Controller logic**:
  ```javascript
  exports.updateStockFromSource = async (req, res) => {
    const { sourceId } = req.params;
    const { inventory } = req.body;
    try {
      const product = await VendorProduct.findOneAndUpdate(
        { sourceRecordId: sourceId },
        { $set: { inventory } },
        { new: true }
      );
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json({ success: true, inventory: product.inventory });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
  ```

---

### Step 4: Checkout Stock Reservation & Status Callbacks (Business ➔ Inventory)

When a customer checks out on the storefront, stock unit reservations are placed inside the central Inventory Hub, and fulfillment updates are pushed back.

#### A. Place Order Stock Reservation on Checkout:
* Inside Winkget-Business checkout routine, place order details to Inventory Hub:
  ```javascript
  async function reserveStockInInventory(businessOrder) {
    const token = jwt.sign(
      { iss: 'winkget_system', source: 'winkget_business' }, 
      process.env.INTEGRATION_SHARED_SECRET
    );
    try {
      await axios.post('http://localhost:5001/api/vendor/orders', {
        businessOrderId: businessOrder._id,
        vendor: businessOrder.vendor,
        items: businessOrder.items.map(item => ({
          productSourceId: item.product.sourceRecordId, // maps storefront item to inventory record ID
          variant: item.variant,
          price: item.price,
          quantity: item.quantity
        })),
        shippingAddress: businessOrder.deliveryAddress,
        paymentStatus: businessOrder.paymentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to reserve inventory stock for order:', err.message);
      // Implement immediate rollback or user error notification
    }
  }
  ```

#### B. Sync Order Fulfillment Status Callback (Inventory ➔ Business):
* **Route**: `PATCH /api/orders/:businessOrderId/status` (triggered when order status changes to "shipped" or "delivered" inside inventory)
* **Controller logic**:
  ```javascript
  exports.updateFulfillmentStatus = async (req, res) => {
    const { businessOrderId } = req.params;
    const { status } = req.body; // e.g. 'shipped', 'delivered', 'cancelled'
    try {
      const order = await Order.findByIdAndUpdate(
        businessOrderId,
        { $set: { status } },
        { new: true }
      );
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Optionally trigger customer alert mechanisms (SMS/Email Dispatch notification)
      
      return res.status(200).json({ success: true, status: order.status });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
  ```

---

## 3. Reliability & Failover Guidelines

1. **Dead-Letter Webhook Retries**:
   * Implement a database collection `failed_syncs` or use a Redis job queue (e.g. BullMQ) to retry syncing events (categories, users, products) if the peer server is temporarily offline.
2. **Atomic Inventory Transactions**:
   * Stock decrements in the `winkget-inventory` database should use MongoDB's atomic operator (`$inc` with negative numbers) combined with a check to prevent negative inventory values:
     ```javascript
     const result = await VendorProduct.updateOne(
       { _id: productId, inventory: { $gte: quantity } },
       { $inc: { inventory: -quantity } }
     );
     ```
3. **SSO Credential Updates**:
   * Ensure user password hash updates are securely synced in real-time so credentials remain synchronized.
