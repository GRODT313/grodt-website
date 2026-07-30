// GET RIPPED OR DIE TRYING | site interactions

(function () {
  "use strict";

  // Mobile menu
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");

  menuBtn.addEventListener("click", function () {
    const open = navLinks.classList.toggle("open");
    menuBtn.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });

  navLinks.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      menuBtn.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Scroll reveal
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".reveal").forEach(function (el) {
    observer.observe(el);
  });

  // Toast
  const toast = document.getElementById("toast");
  let toastTimer = null;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2600);
  }

  // Cart state
  const STORAGE_KEY = "grodt-cart";
  let cart = [];

  try {
    cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    cart = [];
  }

  const cartBtn = document.getElementById("cartBtn");
  const cartCount = document.getElementById("cartCount");
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartClose = document.getElementById("cartClose");
  const cartItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const cartHeadCount = document.getElementById("cartHeadCount");
  const checkoutBtn = document.getElementById("checkoutBtn");

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      /* storage unavailable, cart still works for this visit */
    }
  }

  function cartQty() {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function renderCart() {
    const qty = cartQty();
    cartCount.textContent = String(qty);
    cartHeadCount.textContent = qty > 0 ? "(" + qty + ")" : "";

    if (cart.length === 0) {
      cartItems.innerHTML =
        '<div class="cart-empty">' +
        "<p>Your cart is empty.</p>" +
        '<a href="#shop" class="btn btn-red" id="emptyShopBtn">Shop The Drop</a>' +
        "</div>";
      cartTotal.textContent = "$0";
      checkoutBtn.disabled = true;
      checkoutBtn.style.opacity = "0.5";
      const emptyBtn = document.getElementById("emptyShopBtn");
      if (emptyBtn) {
        emptyBtn.addEventListener("click", closeCart);
      }
      return;
    }

    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = "1";
    cartItems.innerHTML = "";

    cart.forEach(function (item, index) {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML =
        '<img src="' + item.image + '" alt="" />' +
        "<div>" +
        '<p class="cart-item-name">' + item.name + "</p>" +
        '<p class="cart-item-size">Size: ' + item.size + "</p>" +
        '<p class="cart-item-price">$' + item.price * item.qty + "</p>" +
        "</div>" +
        '<div class="cart-item-controls">' +
        '<div class="qty-row">' +
        '<button class="qty-btn" data-action="minus" data-index="' + index + '" aria-label="Decrease quantity">&minus;</button>' +
        '<span class="qty-num">' + item.qty + "</span>" +
        '<button class="qty-btn" data-action="plus" data-index="' + index + '" aria-label="Increase quantity">+</button>' +
        "</div>" +
        '<button class="cart-item-remove" data-action="remove" data-index="' + index + '">Remove</button>' +
        "</div>";
      cartItems.appendChild(row);
    });

    const total = cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
    cartTotal.textContent = "$" + total;
  }

  cartItems.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const index = Number(btn.dataset.index);
    const item = cart[index];
    if (!item) return;

    if (btn.dataset.action === "plus") {
      item.qty += 1;
    } else if (btn.dataset.action === "minus") {
      item.qty -= 1;
      if (item.qty <= 0) cart.splice(index, 1);
    } else if (btn.dataset.action === "remove") {
      cart.splice(index, 1);
    }

    saveCart();
    renderCart();
  });

  // Cart drawer open and close
  function openCart() {
    cartDrawer.classList.add("open");
    cartOverlay.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    cartDrawer.classList.remove("open");
    cartOverlay.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  cartBtn.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCart();
  });

  checkoutBtn.addEventListener("click", function () {
    showToast("Checkout is coming soon. Your cart is saved.");
  });

  // Size selection
  document.querySelectorAll(".size-row").forEach(function (row) {
    row.addEventListener("click", function (e) {
      const btn = e.target.closest(".size-btn");
      if (!btn) return;
      row.querySelectorAll(".size-btn").forEach(function (b) {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");
      row.classList.remove("needs-size");
    });
  });

  // Add to cart
  document.querySelectorAll(".add-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const product = btn.closest(".product");
      const sizeRow = product.querySelector(".size-row");
      const selected = sizeRow.querySelector(".size-btn.selected");

      if (!selected) {
        sizeRow.classList.add("needs-size");
        showToast("Pick a size first");
        return;
      }

      const name = btn.dataset.name;
      const price = Number(btn.dataset.price);
      const size = selected.textContent;
      const image = product.querySelector(".img-main").getAttribute("src");

      const existing = cart.find(function (item) {
        return item.name === name && item.size === size;
      });

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ name: name, price: price, size: size, image: image, qty: 1 });
      }

      saveCart();
      renderCart();
      showToast(name + " (" + size + ") added to cart");
    });
  });

  renderCart();

  // Newsletter signup
  const form = document.getElementById("signupForm");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showToast("You're on the list. First dibs on the next drop.");
    form.querySelector("input[name='email']").value = "";
  });
})();
