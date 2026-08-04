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
  const TEE_IDS = { "oversized-tee": true, "oversized-cutoff-tee": true };
  const SET_PRICE = 100;
  let cart = [];
  let first50Remaining = 50;

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
  const cartDeal = document.getElementById("cartDeal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  function getCartPricing() {
    let teeUnits = 0;
    let shortUnits = 0;
    let regularTotal = 0;

    cart.forEach(function (item) {
      regularTotal += item.price * item.qty;
      if (TEE_IDS[item.id]) teeUnits += item.qty;
      if (item.id === "shorts") shortUnits += item.qty;
    });

    const setsApplied = Math.min(teeUnits, shortUnits, first50Remaining);
    const savings = setsApplied * 25; // $125 regular tee+shorts -> $100 set
    const total = regularTotal - savings;

    return {
      setsApplied: setsApplied,
      savings: savings,
      total: total,
      regularTotal: regularTotal,
    };
  }

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
    const pricing = getCartPricing();
    cartCount.textContent = String(qty);
    cartHeadCount.textContent = qty > 0 ? "(" + qty + ")" : "";

    if (cart.length === 0) {
      cartItems.innerHTML =
        '<div class="cart-empty">' +
        "<p>Your cart is empty.</p>" +
        '<a href="#shop" class="btn btn-red" id="emptyShopBtn">Shop The Drop</a>' +
        "</div>";
      cartTotal.textContent = "$0";
      cartDeal.hidden = true;
      cartDeal.textContent = "";
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

    let teeSlots = pricing.setsApplied;
    let shortSlots = pricing.setsApplied;

    cart.forEach(function (item, index) {
      const lineTotal = item.price * item.qty;
      let priceHtml = "$" + lineTotal;
      let dealNote = "";

      if (TEE_IDS[item.id] && teeSlots > 0) {
        const used = Math.min(item.qty, teeSlots);
        teeSlots -= used;
        dealNote = used === item.qty
          ? "Included in First 50 set"
          : used + " included in First 50 set";
      } else if (item.id === "shorts" && shortSlots > 0) {
        const used = Math.min(item.qty, shortSlots);
        shortSlots -= used;
        dealNote = used === item.qty
          ? "Included in First 50 set"
          : used + " included in First 50 set";
      }

      if (dealNote) {
        priceHtml = "<s>$" + lineTotal + "</s> Set deal";
      }

      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML =
        '<img src="' + item.image + '" alt="" />' +
        "<div>" +
        '<p class="cart-item-name">' + item.name + "</p>" +
        '<p class="cart-item-size">Size: ' + item.size +
        (dealNote ? " · " + dealNote : "") +
        "</p>" +
        '<p class="cart-item-price">' + priceHtml + "</p>" +
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

    cartTotal.textContent = "$" + pricing.total;

    if (pricing.setsApplied > 0) {
      cartDeal.hidden = false;
      cartDeal.textContent =
        "First 50 deal applied: " +
        pricing.setsApplied +
        (pricing.setsApplied === 1 ? " set" : " sets") +
        " at $100 (save $" +
        pricing.savings +
        "). Hoodie not included.";
    } else if (first50Remaining > 0) {
      const hasTee = cart.some(function (item) { return TEE_IDS[item.id]; });
      const hasShorts = cart.some(function (item) { return item.id === "shorts"; });
      if (hasTee && !hasShorts) {
        cartDeal.hidden = false;
        cartDeal.textContent = "Add GRODT Shorts to unlock the $100 First 50 set.";
      } else if (hasShorts && !hasTee) {
        cartDeal.hidden = false;
        cartDeal.textContent = "Add an oversized tee or cut-off tee to unlock the $100 First 50 set.";
      } else {
        cartDeal.hidden = true;
        cartDeal.textContent = "";
      }
    } else {
      cartDeal.hidden = false;
      cartDeal.textContent = "First 50 sets are gone. Regular prices apply.";
    }
  }

  fetch("/api/first50-status")
    .then(function (response) { return response.json(); })
    .then(function (data) {
      if (typeof data.remaining === "number") {
        first50Remaining = data.remaining;
        renderCart();
      }
    })
    .catch(function () {
      /* keep local default of 50 */
    });

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

  checkoutBtn.addEventListener("click", async function () {
    if (cart.length === 0) {
      showToast("Your cart is empty");
      return;
    }

    const originalLabel = checkoutBtn.textContent;
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Redirecting...";

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(function (item) {
            return {
              id: item.id,
              size: item.size,
              qty: item.qty,
            };
          }),
        }),
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      showToast(err.message || "Checkout failed. Try again.");
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = originalLabel;
    }
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

      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = Number(btn.dataset.price);
      const size = selected.textContent;
      const image = product.querySelector(".img-main").getAttribute("src");

      if (!id) {
        showToast("This product is missing a product id");
        return;
      }

      const existing = cart.find(function (item) {
        return item.id === id && item.size === size;
      });

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ id: id, name: name, price: price, size: size, image: image, qty: 1 });
      }

      saveCart();
      renderCart();
      showToast(name + " (" + size + ") added to cart");
    });
  });

  // Drop cart lines that predate product ids so checkout can validate
  cart = cart.filter(function (item) {
    return item && item.id && item.size && item.qty;
  });
  saveCart();
  renderCart();

  // Show a note if the shopper canceled Stripe Checkout
  if (new URLSearchParams(window.location.search).get("checkout") === "canceled") {
    showToast("Checkout canceled. Your cart is still here.");
    history.replaceState({}, "", window.location.pathname + window.location.hash);
  }

  // Contact form → mal@getrippedodt.com via FormSubmit
  const contactForm = document.getElementById("contactForm");
  const contactStatus = document.getElementById("contactStatus");
  const contactSubmit = document.getElementById("contactSubmit");

  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (contactForm.querySelector("input[name='_honey']").value) {
      return;
    }

    const name = contactForm.querySelector("input[name='name']").value.trim();
    const email = contactForm.querySelector("input[name='email']").value.trim();
    const phone = contactForm.querySelector("input[name='phone']").value.trim();
    const message = contactForm.querySelector("textarea[name='message']").value.trim();

    if (!name || !email || !message) {
      contactStatus.textContent = "Please fill in your name, email, and message.";
      return;
    }

    contactSubmit.disabled = true;
    contactSubmit.textContent = "Sending...";
    contactStatus.textContent = "";

    try {
      const response = await fetch("https://formsubmit.co/ajax/mal@getrippedodt.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone || "Not provided",
          message: message,
          _subject: "New message from GRODT website",
        }),
      });

      const data = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        throw new Error(data.message || "Could not send message");
      }

      contactForm.reset();
      contactStatus.textContent = "Message sent. We'll reach out soon.";
      showToast("Message sent to GRODT");
    } catch (err) {
      contactStatus.textContent =
        "Couldn't send right now. Email us at mal@getrippedodt.com.";
    } finally {
      contactSubmit.disabled = false;
      contactSubmit.textContent = "Send Message";
    }
  });

  // Newsletter signup → same inbox as contact
  const form = document.getElementById("signupForm");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const emailInput = form.querySelector("input[name='email']");
    const email = emailInput.value.trim();
    if (!email) return;

    try {
      await fetch("https://formsubmit.co/ajax/mal@getrippedodt.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email,
          _subject: "GRODT grind list signup",
          message: "New email signup from the website.",
        }),
      });
      showToast("You're on the list. First dibs on the next drop.");
      emailInput.value = "";
    } catch (err) {
      showToast("Couldn't sign you up. Email mal@getrippedodt.com.");
    }
  });
})();
