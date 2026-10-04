"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  Download,
  LogOut,
  Settings,
  Package,
  Star,
  Image,
  Users,
  GripVertical,
  Sparkles,
  BookOpen,
  Eye,
  Printer,
} from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import {
  getProducts,
  upsertProduct,
  deleteProduct,
  getSettings,
  saveSettings,
  saveProductOrder,
  getTestimonials,
  upsertTestimonial,
  deleteTestimonial,
  getAllPageContent,
  uploadImage,
  getPageSectionSchemas,
  getGalleryImages,
  promoteUserToAdmin,
  demoteAdmin,
  supabase,
} from "@/lib/supabase";
import {
  getBlogExcerpt,
  hasBlogBodyContent,
} from "@/lib/blogs.js";
import PageContentEditor from "@/components/PageContentEditor";
import BlogRichTextEditor from "@/components/admin/BlogRichTextEditor";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import ReceiptBuilder from "@/components/admin/ReceiptBuilder";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

// Instant Showers group + new categories
const CATS = [
  { value: "standard", label: "Instant Shower", group: "Instant Showers" },
  { value: "pump", label: "With Pump", group: "Instant Showers" },
  { value: "showerhead", label: "Shower Heads", group: "Instant Showers" },
  { value: "accessory", label: "Accessories", group: "Instant Showers" },
  { value: "bulbs_lighting", label: "Bulbs & Lighting", group: "Electrical" },
  {
    value: "switches_sockets",
    label: "Switches & Sockets",
    group: "Electrical",
  },
  { value: "solar_solutions", label: "Solar Solutions", group: "Solar" },
  { value: "water_pumps", label: "Water Pumps", group: "Water" },
];
const GROUPS = Array.from(new Set(CATS.map((c) => c.group)));
const CORE_TABS = [
  { key: "products", label: "Products", icon: <Package size={16} /> },
  { key: "services", label: "Services", icon: <Sparkles size={16} /> },
  { key: "blog", label: "Blog", icon: <BookOpen size={16} /> },
  { key: "testimonials", label: "Testimonials", icon: <Star size={16} /> },
  { key: "gallery", label: "Gallery", icon: <Image size={16} /> },
  { key: "pageContent", label: "Pages", icon: <Settings size={16} /> },
  { key: "settings", label: "Settings", icon: <Settings size={16} /> },
];

const ADMIN_TABS = [
  { key: "analytics", label: "Analytics", icon: <Eye size={16} /> },
  { key: "receipt", label: "Receipt Builder", icon: <Printer size={16} /> },
  { key: "admins", label: "Admins", icon: <Users size={16} /> },
];

const TABS = [...CORE_TABS, ...ADMIN_TABS];

const ANIMATION_STYLES = [
  { value: "float", label: "Floating Motion - gentle up/down" },
  { value: "pulse", label: "Soft Pulse - subtle breathing effect" },
  { value: "glow", label: "Glow Effect - light shadow on hover" },
  { value: "slide-up", label: "Slide Up - lifts on hover" },
  { value: "scale", label: "Scale - grows slightly on hover" },
  { value: "rotate", label: "Subtle Rotation - turns on hover" },
  { value: "shimmer", label: "Shimmer Border - light sweep effect" },
];

const ICON_OPTIONS = [
  { value: "Zap", label: "⚡ Zap - Lightning (Water Heater)" },
  { value: "Droplets", label: "💧 Droplets - Water (Pumps)" },
  { value: "Sun", label: "☀️ Sun - Solar" },
  { value: "ToggleRight", label: "🔘 ToggleRight - Electrical" },
  { value: "Wrench", label: "🔧 Wrench - Repairs" },
  { value: "PhoneCall", label: "📞 PhoneCall - Consultation" },
  { value: "Sparkles", label: "✨ Sparkles - Premium" },
];

const EMPTY_PRODUCT = {
  name: "",
  model: "",
  cat: "standard",
  catLabel: "",
  group: "Instant Showers",
  price: "",
  desc: "",
  badge: "",
  images: [],
  features: [],
  specs: {},
};

function getCategoryLabel(cat, fallback = "") {
  return CATS.find((c) => c.value === cat)?.label || fallback || cat;
}

function moveProduct(products, draggedId, targetId) {
  const fromIndex = products.findIndex((p) => p.id === draggedId);
  const toIndex = products.findIndex((p) => p.id === targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
    return products;
  const next = [...products];
  const [dragged] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, dragged);
  return next;
}

export default function AdminPage() {
  useEffect(() => {
    document.title = "Admin Dashboard";
  }, []);
  const auth = useAuth();
  const {
    user,
    loading: authLoading,
    isAdmin,
    signOut: authSignOut,
  } = auth ?? {
    user: null,
    loading: true,
    isAdmin: false,
    signOut: async () => {},
  };
  const route = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState("products");
  const visibleTabs = isAdmin ? TABS : CORE_TABS;
  const selectedTab = pathname === "/admin/blogs" ? "blog" : tab;
  const currentTab = visibleTabs.some((item) => item.key === selectedTab)
    ? selectedTab
    : visibleTabs[0]?.key || "products";

  // Products
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [dragOverProductId, setDragOverProductId] = useState(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  // Testimonials
  const [testimonials, setTestimonials] = useState([]);
  const [tForm, setTForm] = useState({ name: "", location: "", text: "" });

  // Gallery
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    description: "",
    category: "installation",
  });
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryImageUrl, setGalleryImageUrl] = useState("");
  const galleryFileRef = useRef();

  // Settings
  const [settings, setSettings] = useState({
    whatsapp_number: "254701039256",
    hero_title: "Hot Water.|Every Morning.",
    hero_subtitle: "",
    stat_customers: "500+",
    stat_rating: "4.9/5",
  });

  // Page content CMS
  const [pageContent, setPageContent] = useState({
    about: null,
    portfolio: null,
  });

  // Services
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [pendingServiceImages, setPendingServiceImages] = useState([]);
  const [draggedServiceId, setDraggedServiceId] = useState(null);
  const [dragOverServiceId, setDragOverServiceId] = useState(null);
  const serviceImagesRef = useRef();

  // Blog
  const [blogs, setBlogs] = useState([]);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogSaving, setBlogSaving] = useState(false);
  const [draggedBlogId, setDraggedBlogId] = useState(null);
  const [dragOverBlogId, setDragOverBlogId] = useState(null);
  const blogImageRef = useRef();

  // Admins
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  const fileRef = useRef();

  // ── Auth guards ───────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) route.push("/login");
  }, [authLoading, user, route]);

  useEffect(() => {
    if (!isAdmin) return;
    loadProducts();
    loadServices();
    loadBlogs();
    loadAdmins();
    getTestimonials()
      .then(setTestimonials)
      .catch(() => {});
    getGalleryImages()
      .then(setGalleryImages)
      .catch(() => {});
    getSettings()
      .then((s) => s && setSettings((prev) => ({ ...prev, ...s })))
      .catch(() => {});
    loadPageContent();
  }, [isAdmin]);

  // ── Loaders ───────────────────────────────────────────────
  function loadProducts() {
    return getProducts().then(setProducts).catch(() => {});
  }

  async function loadServices() {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      setServices(data || []);
    } catch (e) {
      console.error("loadServices error:", e);
      setServices([]);
    }
  }

  async function loadAdmins() {
    setAdminsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_users");
      if (error) throw error;
      setAdmins(data || []);
    } catch (e) {
      console.error("loadAdmins error:", e);
      setAdmins([]);
    } finally {
      setAdminsLoading(false);
    }
  }

  async function loadBlogs() {
    try {
      let { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("published_at", { ascending: false });
      if (
        error &&
        String(error.message || "")
          .toLowerCase()
          .includes("order_index")
      ) {
        ({ data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .order("published_at", { ascending: false }));
      }
      if (error) throw error;
      setBlogs(data || []);
    } catch (e) {
      console.error("loadBlogs error:", e);
      setBlogs([]);
    }
  }

  async function loadPageContent() {
    const rows = await getAllPageContent();
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.page_slug]) acc[row.page_slug] = {};
      acc[row.page_slug][row.section_key] = row.content;
      return acc;
    }, {});
    setPageContent(grouped);
  };

  // ── Admins ────────────────────────────────────────────────
  const handlePromoteAdmin = async () => {
    if (!newAdminEmail.trim()) return alert("Enter an email to promote.");
    setAdminActionLoading(true);
    setAdminMessage("");
    try {
      await promoteUserToAdmin(newAdminEmail.trim());
      setAdminMessage(`${newAdminEmail.trim()} is now an admin.`);
      setNewAdminEmail("");
      loadAdmins();
    } catch (err) {
      alert(
        err.message || "Unable to add admin. Make sure the user has signed up.",
      );
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDemoteAdmin = async (id) => {
    if (!confirm("Remove admin access for this user?")) return;
    setAdminActionLoading(true);
    try {
      await demoteAdmin(id);
      setAdminMessage("Admin access removed.");
      loadAdmins();
    } catch (err) {
      alert(err.message || "Unable to remove admin.");
    } finally {
      setAdminActionLoading(false);
    }
  };

  // ── Products ──────────────────────────────────────────────
  const startNew = () => setEditing({ ...EMPTY_PRODUCT });
  const startEdit = (p) => {
    const found = CATS.find((c) => c.value === p.cat);
    setEditing({
      ...p,
      group: found?.group || "Instant Showers",
      catLabel: getCategoryLabel(p.cat, p.catLabel),
      features: p.features || [],
      specs: p.specs || {},
      images: p.images || [],
    });
  };

  const handleSave = async () => {
    if (!editing.name || !editing.price)
      return alert("Name and price are required.");
    setSaving(true);
    try {
      await upsertProduct({ ...editing, price: Number(editing.price) });
      setEditing(null);
      loadProducts();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id);
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    await saveProductOrder(next.map((p) => p.id));
    loadProducts();
  };

  const persistProductOrder = async (next) => {
    setProducts(next);
    setOrderSaving(true);
    setOrderMessage("Saving order...");
    try {
      await saveProductOrder(next.map((p) => p.id));
      setOrderMessage("Order saved");
    } catch {
      setOrderMessage("Could not save order");
      loadProducts();
    } finally {
      setOrderSaving(false);
      window.setTimeout(
        () => setOrderMessage((c) => (c === "Order saved" ? "" : c)),
        1800,
      );
    }
  };

  const handleProductDrop = async (targetId) => {
    if (!draggedProductId || draggedProductId === targetId) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      return;
    }
    const next = moveProduct(products, draggedProductId, targetId);
    setDraggedProductId(null);
    setDragOverProductId(null);
    await persistProductOrder(next);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadImage(file);
      setEditing((prev) => ({
        ...prev,
        images: [...(prev.images || []), url],
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (i) =>
    setEditing((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== i),
    }));
  const addFeature = () => {
    if (!featureInput.trim()) return;
    setEditing((prev) => ({
      ...prev,
      features: [...prev.features, featureInput.trim()],
    }));
    setFeatureInput("");
  };
  const removeFeature = (i) =>
    setEditing((prev) => ({
      ...prev,
      features: prev.features.filter((_, idx) => idx !== i),
    }));
  const addSpec = () => {
    if (!specKey.trim() || !specVal.trim()) return;
    setEditing((prev) => ({
      ...prev,
      specs: { ...prev.specs, [specKey.trim()]: specVal.trim() },
    }));
    setSpecKey("");
    setSpecVal("");
  };
  const removeSpec = (k) =>
    setEditing((prev) => {
      const s = { ...prev.specs };
      delete s[k];
      return { ...prev, specs: s };
    });

  // ── Services ──────────────────────────────────────────────
  const startNewService = () => {
    setEditingService({
      id: null,
      title: "",
      description: "",
      icon_name: "Zap",
      features: [],
      images: [],
      image_url: null,
      animation_style: "float",
      order_index: services.length || 0,
      is_active: true,
      badge_text: "",
      cta_text: "Learn More",
    });
    setPendingServiceImages([]);
  };
  const startEditService = (s) => {
    setEditingService({
      ...s,
      features: s.features || [],
      images: s.images || [],
    });
    setPendingServiceImages([]);
  };

  const handleServiceImagesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingServiceImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      })),
    ]);
    e.target.value = "";
  };

  const removePendingImage = (idx) =>
    setPendingServiceImages((prev) => prev.filter((_, i) => i !== idx));
  const updatePendingCaption = (idx, caption) =>
    setPendingServiceImages((prev) =>
      prev.map((img, i) => (i === idx ? { ...img, caption } : img)),
    );
  const removeServiceImage = (imageIndex) =>
    setEditingService((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== imageIndex),
    }));

  const uploadOneServiceImage = async (file, caption = "") => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from("service-images")
      .upload(`service-images/${fileName}`, file);
    if (error) throw error;
    const { data } = supabase.storage
      .from("service-images")
      .getPublicUrl(`service-images/${fileName}`);
    return {
      url: data.publicUrl,
      caption,
      uploaded_at: new Date().toISOString(),
    };
  };

  const saveService = async () => {
    if (!editingService?.title) return alert("Service title is required");
    setServiceSaving(true);
    try {
      const uploadedImages = await Promise.all(
        pendingServiceImages.map((p) =>
          uploadOneServiceImage(p.file, p.caption),
        ),
      );
      const allImages = [...(editingService.images || []), ...uploadedImages];
      const serviceData = {
        title: editingService.title,
        description: editingService.description,
        icon_name: editingService.icon_name,
        features: editingService.features || [],
        images: allImages,
        image_url: allImages[0]?.url || editingService.image_url || null,
        animation_style: editingService.animation_style,
        order_index: editingService.order_index,
        is_active: editingService.is_active,
        badge_text: editingService.badge_text || null,
        cta_text: editingService.cta_text || "Learn More",
      };
      if (editingService.id) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(serviceData);
        if (error) throw error;
      }
      setPendingServiceImages([]);
      setEditingService(null);
      await loadServices();
    } catch (e) {
      alert("Error saving service: " + (e.message || e));
    } finally {
      setServiceSaving(false);
    }
  };

  const deleteService = async (id) => {
    if (!confirm("Delete this service?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadServices();
  };

  const persistServiceOrder = async (next) => {
    setServices(next);
    setOrderSaving(true);
    setOrderMessage("Saving order...");
    try {
      for (let i = 0; i < next.length; i++) {
        const { error } = await supabase
          .from("services")
          .update({ order_index: i })
          .eq("id", next[i].id);
        if (error) throw error;
      }
      setOrderMessage("Order saved");
    } catch {
      setOrderMessage("Could not save order");
      loadServices();
    } finally {
      setOrderSaving(false);
      window.setTimeout(
        () => setOrderMessage((c) => (c === "Order saved" ? "" : c)),
        1800,
      );
    }
  };

  const handleServiceDrop = async (targetId) => {
    if (!draggedServiceId || draggedServiceId === targetId) {
      setDraggedServiceId(null);
      setDragOverServiceId(null);
      return;
    }
    const next = moveProduct(services, draggedServiceId, targetId);
    setDraggedServiceId(null);
    setDragOverServiceId(null);
    await persistServiceOrder(next);
  };

  const addServiceFeature = () => {
    const input = document.getElementById("new-feature-input");
    if (!input || !input.value.trim()) return;
    setEditingService((prev) => ({
      ...prev,
      features: [...(prev.features || []), input.value.trim()],
    }));
    input.value = "";
  };
  const removeServiceFeature = (idx) =>
    setEditingService((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== idx),
    }));

  // ── Blog ──────────────────────────────────────────────────
  const generateSlug = (value) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const startNewBlog = () =>
    setEditingBlog({
      id: null,
      title: "",
      slug: "",
      excerpt: "",
      body: "",
      category: "General",
      tags: [],
      featured_image_url: "",
      status: "Draft",
      published_at: new Date().toISOString(),
      author: "",
      order_index: blogs.length || 0,
    });

  const startEditBlog = (post) =>
    setEditingBlog({
      ...post,
      tags: Array.isArray(post.tags)
        ? post.tags
        : post.tags
          ? String(post.tags)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
      published_at: post.published_at || new Date().toISOString(),
      body: post.body || post.content || "",
      order_index: post.order_index ?? 0,
    });

  const handleBlogImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBlogSaving(true);
    try {
      const url = await uploadImage(file, "blog-images");
      setEditingBlog((prev) => ({ ...prev, featured_image_url: url }));
    } catch (error) {
      alert(error.message || "Unable to upload image");
    } finally {
      setBlogSaving(false);
    }
  };

  const saveBlogPost = async () => {
    if (!editingBlog?.title || !hasBlogBodyContent(editingBlog?.body))
      return alert("Title and body are required.");
    setBlogSaving(true);
    try {
      const slug = editingBlog.slug
        ? generateSlug(editingBlog.slug)
        : generateSlug(editingBlog.title);
      const blogData = {
        title: editingBlog.title,
        slug,
        excerpt: editingBlog.excerpt,
        body: editingBlog.body,
        category: editingBlog.category,
        tags: Array.isArray(editingBlog.tags)
          ? editingBlog.tags
          : String(editingBlog.tags)
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
        featured_image_url: editingBlog.featured_image_url || "",
        status: editingBlog.status || "Draft",
        published_at: editingBlog.published_at || new Date().toISOString(),
        author: editingBlog.author?.trim() || "TruePower Team",
        order_index: editingBlog.order_index ?? blogs.length ?? 0,
        updated_at: new Date().toISOString(),
      };
      if (editingBlog.id) {
        let { error } = await supabase
          .from("blog_posts")
          .update(blogData)
          .eq("id", editingBlog.id);
        if (
          error &&
          String(error.message || "")
            .toLowerCase()
            .includes("order_index")
        ) {
          const { order_index, ...fallbackData } = blogData;
          ({ error } = await supabase
            .from("blog_posts")
            .update(fallbackData)
            .eq("id", editingBlog.id));
        }
        if (error) throw error;
      } else {
        let { error } = await supabase.from("blog_posts").insert(blogData);
        if (
          error &&
          String(error.message || "")
            .toLowerCase()
            .includes("order_index")
        ) {
          const { order_index, ...fallbackData } = blogData;
          ({ error } = await supabase.from("blog_posts").insert(fallbackData));
        }
        if (error) throw error;
      }
      setEditingBlog(null);
      await loadBlogs();
    } catch (error) {
      alert(error.message || "Unable to save blog post.");
    } finally {
      setBlogSaving(false);
    }
  };

  const toggleBlogStatus = async (post) => {
    const nextStatus =
      (post.status || (post.is_published ? "Published" : "Draft")) ===
      "Published"
        ? "Draft"
        : "Published";
    const published_at =
      nextStatus === "Published"
        ? post.published_at || new Date().toISOString()
        : post.published_at;
    const { error } = await supabase
      .from("blog_posts")
      .update({ status: nextStatus, published_at })
      .eq("id", post.id);
    if (error) return alert(error.message || "Unable to update status.");
    await loadBlogs();
  };

  const deleteBlogPost = async (id) => {
    if (!confirm("Delete this blog post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      alert(error.message || "Unable to delete blog post.");
      return;
    }
    await loadBlogs();
  };

  const persistBlogOrder = async (next) => {
    setBlogs(next);
    setOrderSaving(true);
    setOrderMessage("Saving order...");
    try {
      for (let i = 0; i < next.length; i++) {
        const { error } = await supabase
          .from("blog_posts")
          .update({ order_index: i })
          .eq("id", next[i].id);
        if (error) throw error;
      }
      setOrderMessage("Order saved");
    } catch (error) {
      console.error("persistBlogOrder error:", error);
      if (
        String(error?.message || "")
          .toLowerCase()
          .includes("order_index")
      ) {
        setOrderMessage("Blog ordering needs a blog_posts.order_index column");
      } else {
        setOrderMessage("Could not save order");
      }
      loadBlogs();
    } finally {
      setOrderSaving(false);
      window.setTimeout(
        () =>
          setOrderMessage((current) =>
            current === "Order saved" ? "" : current,
          ),
        2200,
      );
    }
  };

  const handleBlogDrop = async (targetId) => {
    if (!draggedBlogId || draggedBlogId === targetId) {
      setDraggedBlogId(null);
      setDragOverBlogId(null);
      return;
    }
    const next = moveProduct(blogs, draggedBlogId, targetId);
    setDraggedBlogId(null);
    setDragOverBlogId(null);
    await persistBlogOrder(next);
  };

  // ── Testimonials ──────────────────────────────────────────
  const saveTestimonial = async () => {
    if (!tForm.name || !tForm.text) return;
    await upsertTestimonial(tForm);
    setTForm({ name: "", location: "", text: "" });
    getTestimonials().then(setTestimonials);
  };

  // ── Settings ──────────────────────────────────────────────
  const handleSaveSettings = async () => {
    await saveSettings(settings);
    alert("Settings saved!");
  };

  // ── Auth ──────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await authSignOut();
    } catch (error) {
      console.error("Admin logout failed:", error);
    } finally {
      route.push("/login");
    }
  }

  // ── Loading / access states ───────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-border p-10 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="font-display font-bold text-2xl mb-2">
            Admin access required
          </h1>
          <p className="text-sub mb-6">
            Your account is signed in, but it does not have administrator
            access.
          </p>
          <button
            onClick={() => route.push("/")}
            className="btn-primary px-6 py-3"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <main className="min-w-0 max-w-full overflow-x-hidden pt-16 min-h-screen">
      <div className="mx-auto w-full min-w-0 max-w-full overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-2xl">Admin Dashboard</h1>
            <p className="text-sub text-sm">{user?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <a
              href="/downloads/TruePower-Receipt-Builder.apk"
              download="TruePower-Receipt-Builder.apk"
              className="inline-flex items-center gap-2 rounded-full bg-[#12336b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0b2858]"
              title="Download the Android receipt printer app"
            >
              <Download size={16} /> Download APK
            </a>
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setTab("analytics")}
                  className="btn-outline text-sm px-4 py-2"
                >
                  Analytics
                </button>
                <button
                  type="button"
                  onClick={() => setTab("receipt")}
                  className="btn-outline text-sm px-4 py-2"
                >
                  Receipt Builder
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="btn-ghost inline-flex items-center gap-2 text-sub hover:text-red-400"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 overflow-hidden border-b border-border pb-2">
          <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:gap-2">
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-center font-display text-xs font-semibold transition-colors border-b-2 -mb-[2px] sm:flex-shrink-0 sm:px-4 sm:text-sm ${
                  currentTab === t.key
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-sub hover:text-ink"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            PRODUCTS TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "products" && (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <p className="text-sub text-sm">{products.length} products</p>
                <p className="text-faint text-xs mt-1">
                  Drag products with the handle to reorder them.
                </p>
              </div>
              <button
                onClick={startNew}
                className="btn-primary text-sm px-4 py-2.5"
              >
                <Plus size={16} /> Add Product
              </button>
            </div>

            {orderMessage && (
              <div className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-600">
                {orderSaving ? "Saving order..." : orderMessage}
              </div>
            )}

            {/* Product form */}
            {editing && (
              <div className="card p-6 mb-6 border-brand-500/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <h3 className="font-display font-bold text-lg">
                    {editing.id ? "Edit Product" : "New Product"}
                  </h3>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-sub hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="label">Product Name *</label>
                    <input
                      className="input"
                      value={editing.name}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g. HeatMaster 3000W Electric Shower"
                    />
                  </div>
                  <div>
                    <label className="label">Model / SKU</label>
                    <input
                      className="input"
                      value={editing.model}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, model: e.target.value }))
                      }
                      placeholder="HM-3000"
                    />
                  </div>
                  <div>
                    <label className="label">Category Group</label>
                    <select
                      className="input"
                      value={editing.group}
                      onChange={(e) => {
                        const group = e.target.value;
                        const first = CATS.find((c) => c.group === group);
                        setEditing((p) => ({
                          ...p,
                          group,
                          cat: first?.value || p.cat,
                          catLabel: first?.label || p.catLabel,
                        }));
                      }}
                    >
                      {GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Subcategory *</label>
                    <select
                      className="input"
                      value={editing.cat}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          cat: e.target.value,
                          catLabel: CATS.find((c) => c.value === e.target.value)
                            ?.label,
                        }))
                      }
                    >
                      {CATS.filter((c) => c.group === editing.group).map(
                        (c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="label">Price (KSh) *</label>
                    <input
                      className="input"
                      type="number"
                      value={editing.price}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, price: e.target.value }))
                      }
                      placeholder="12500"
                    />
                  </div>
                  <div>
                    <label className="label">Badge (optional)</label>
                    <input
                      className="input"
                      value={editing.badge}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, badge: e.target.value }))
                      }
                      placeholder="Best Seller"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      className="input h-24 resize-none"
                      value={editing.desc}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, desc: e.target.value }))
                      }
                      placeholder="Short product description..."
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="mb-4">
                  <label className="label">Images</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editing.images?.map((img, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-border"
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 rounded-xl border border-dashed border-border hover:border-brand-500 flex items-center justify-center text-sub hover:text-brand-500 transition-colors"
                    >
                      <Upload size={20} />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <label className="label">Key Features</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      className="input flex-1"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addFeature()}
                      placeholder="e.g. Thermal cutoff protection"
                    />
                    <button
                      onClick={addFeature}
                      className="btn-outline px-4 py-2.5 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editing.features?.map((f, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1 text-sm"
                      >
                        {f}{" "}
                        <button
                          onClick={() => removeFeature(i)}
                          className="text-sub hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specs */}
                <div className="mb-6">
                  <label className="label">Specifications</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      className="input flex-1"
                      value={specKey}
                      onChange={(e) => setSpecKey(e.target.value)}
                      placeholder="e.g. Wattage"
                    />
                    <input
                      className="input flex-1"
                      value={specVal}
                      onChange={(e) => setSpecVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addSpec()}
                      placeholder="e.g. 3000W"
                    />
                    <button
                      onClick={addSpec}
                      className="btn-outline px-4 py-2.5 text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(editing.specs || {}).map(([k, v]) => (
                      <span
                        key={k}
                        className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1 text-sm"
                      >
                        <span className="text-sub">{k}:</span> {v}
                        <button
                          onClick={() => removeSpec(k)}
                          className="text-sub hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? "Saving..." : "Save Product"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Product list */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => setDraggedProductId(p.id)}
                  onDragEnd={() => {
                    setDraggedProductId(null);
                    setDragOverProductId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverProductId !== p.id) setDragOverProductId(p.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleProductDrop(p.id);
                  }}
                  className={`card relative min-w-0 cursor-move overflow-hidden p-0 transition-all ${draggedProductId === p.id ? "opacity-60 ring-2 ring-brand-200" : ""} ${dragOverProductId === p.id ? "ring-2 ring-brand-400 shadow-product-hover" : ""}`}
                >
                  <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
                    <button type="button" draggable onDragStart={() => setDraggedProductId(p.id)} className="rounded-xl border border-border bg-muted p-2 text-sub hover:text-brand-500" title="Drag to reorder"><GripVertical size={16} /></button>
                    <div className="flex items-center gap-1 rounded-xl border border-white/70 bg-white/90 p-0.5 shadow-sm backdrop-blur">
                      <button type="button" onClick={() => startEdit(p)} className="rounded-lg p-2 text-sub transition-colors hover:bg-brand-50 hover:text-brand-500" title="Edit product"><Edit2 size={16} /></button>
                      <button type="button" onClick={() => handleDelete(p.id)} className="rounded-lg p-2 text-sub transition-colors hover:bg-red-50 hover:text-red-500" title="Delete product"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="relative flex h-64 w-full items-center justify-center overflow-hidden bg-slate-50 sm:h-56">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Package size={42} className="text-slate-300" />
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 min-w-0 overflow-hidden bg-[#292566] px-4 py-3 text-white shadow-[0_-8px_20px_rgba(41,37,102,0.16)]">
                    <p className="line-clamp-2 min-w-0 max-w-full whitespace-normal break-words text-center text-sm font-bold leading-snug [overflow-wrap:anywhere]">
                      {p.name}
                    </p>
                    <p className="mt-1 text-center text-xs capitalize text-white/80">
                      {getCategoryLabel(p.cat, p.catLabel)} · KSh{" "}
                      <span className="font-bold text-white">{Number(p.price).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="text-center py-16 text-sub col-span-2">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No products yet. Add your first one!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SERVICES TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "services" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sub text-sm">{services.length} services</p>
                <p className="text-faint text-xs mt-1">
                  Manage service cards shown on the Services page
                </p>
              </div>
              <button
                onClick={startNewService}
                className="btn-primary text-sm px-4 py-2.5"
              >
                <Plus size={16} /> Add Service
              </button>
            </div>

            {editingService && (
              <div className="card p-6 mb-6 border-brand-500/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display font-bold text-lg">
                    {editingService.id ? "Edit Service" : "New Service"}
                  </h3>
                  <button
                    onClick={() => setEditingService(null)}
                    className="text-sub hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="label">Service Title *</label>
                    <input
                      className="input"
                      value={editingService.title}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          title: e.target.value,
                        }))
                      }
                      placeholder="e.g. Water Heater Installation"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Description</label>
                    <textarea
                      className="input h-24 resize-none"
                      value={editingService.description}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Short service description..."
                    />
                  </div>
                  <div>
                    <label className="label">Icon</label>
                    <select
                      className="input"
                      value={editingService.icon_name}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          icon_name: e.target.value,
                        }))
                      }
                    >
                      {ICON_OPTIONS.map((icon) => (
                        <option key={icon.value} value={icon.value}>
                          {icon.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Animation Style</label>
                    <select
                      className="input"
                      value={editingService.animation_style}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          animation_style: e.target.value,
                        }))
                      }
                    >
                      {ANIMATION_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Badge Text (optional)</label>
                    <input
                      className="input"
                      value={editingService.badge_text || ""}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          badge_text: e.target.value,
                        }))
                      }
                      placeholder="Popular, Best Seller, etc."
                    />
                  </div>
                  <div>
                    <label className="label">CTA Button Text</label>
                    <input
                      className="input"
                      value={editingService.cta_text || "Learn More"}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          cta_text: e.target.value,
                        }))
                      }
                      placeholder="Learn More"
                    />
                  </div>
                  <div>
                    <label className="label">
                      Order Index (lower = higher position)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={editingService.order_index}
                      onChange={(e) =>
                        setEditingService((p) => ({
                          ...p,
                          order_index: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0, 1, 2..."
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="label flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingService.is_active}
                        onChange={(e) =>
                          setEditingService((p) => ({
                            ...p,
                            is_active: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      Active (show on website)
                    </label>
                  </div>

                  {/* Multi-Image Uploader */}
                  <div className="md:col-span-2 border-t border-border pt-6 mt-2">
                    <label className="label mb-3 block">
                      Service Images
                      <span className="text-faint font-normal ml-2">
                        — shown as a carousel on the services page
                      </span>
                    </label>
                    {editingService.images &&
                      editingService.images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {editingService.images.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-xl overflow-hidden border border-border bg-muted"
                            >
                              <img
                                src={img.url}
                                alt={img.caption || ""}
                                className="w-full h-28 object-cover"
                                onError={(e) => {
                                  e.target.src =
                                    "https://placehold.co/400x300?text=Error";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => removeServiceImage(idx)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                <X size={11} />
                              </button>
                              {img.caption && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-white text-[10px] truncate">
                                  {img.caption}
                                </div>
                              )}
                              {idx === 0 && (
                                <div className="absolute top-1.5 left-1.5 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                  Cover
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    {pendingServiceImages.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-brand-600 font-semibold mb-2">
                          ⏳ Queued — will upload when you Save Service (
                          {pendingServiceImages.length} image
                          {pendingServiceImages.length > 1 ? "s" : ""})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {pendingServiceImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="relative group rounded-xl overflow-hidden border-2 border-dashed border-brand-300 bg-brand-50"
                            >
                              <img
                                src={img.previewUrl}
                                alt=""
                                className="w-full h-28 object-cover opacity-80"
                              />
                              <button
                                type="button"
                                onClick={() => removePendingImage(idx)}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={11} />
                              </button>
                              <div className="p-1">
                                <input
                                  type="text"
                                  value={img.caption}
                                  onChange={(e) =>
                                    updatePendingCaption(idx, e.target.value)
                                  }
                                  placeholder="Caption (optional)"
                                  className="w-full text-[11px] bg-white border border-border rounded px-1.5 py-0.5 text-ink"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => serviceImagesRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-brand-500 text-sub hover:text-brand-500 transition-colors text-sm font-medium"
                    >
                      <Upload size={16} /> Add Images (select multiple)
                    </button>
                    <input
                      ref={serviceImagesRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleServiceImagesSelect}
                    />
                    <p className="text-faint text-xs mt-2">
                      Recommended: 800x600px, JPG or PNG. First image = cover.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="md:col-span-2">
                    <label className="label">
                      Key Features (shown as checklist)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        id="new-feature-input"
                        className="input flex-1"
                        placeholder="e.g. Professional installation"
                        onKeyDown={(e) =>
                          e.key === "Enter" && addServiceFeature()
                        }
                      />
                      <button
                        onClick={addServiceFeature}
                        className="btn-outline px-4 py-2.5 text-sm"
                      >
                        Add Feature
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(editingService.features || []).map((f, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-3 py-1 text-sm"
                        >
                          {f}{" "}
                          <button
                            onClick={() => removeServiceFeature(i)}
                            className="text-sub hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={saveService}
                    disabled={serviceSaving}
                    className="btn-primary"
                  >
                    <Save size={16} />{" "}
                    {serviceSaving ? "Saving..." : "Save Service"}
                  </button>
                  <button
                    onClick={() => setEditingService(null)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Service List */}
            <div className="grid grid-cols-1 gap-3">
              {services.map((s) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDraggedServiceId(s.id)}
                  onDragEnd={() => {
                    setDraggedServiceId(null);
                    setDragOverServiceId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverServiceId !== s.id) setDragOverServiceId(s.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleServiceDrop(s.id);
                  }}
                  className={`card p-4 flex items-center gap-4 hover:shadow-md transition-shadow ${draggedServiceId === s.id ? "opacity-60 ring-2 ring-brand-200" : ""} ${dragOverServiceId === s.id ? "ring-2 ring-brand-400 shadow-product-hover" : ""}`}
                >
                  {(s.images && s.images.length > 0) || s.image_url ? (
                    <img
                      src={s.images?.[0]?.url || s.image_url}
                      alt={s.title}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-2xl">
                      {s.icon_name === "Zap"
                        ? "⚡"
                        : s.icon_name === "Sun"
                          ? "☀️"
                          : s.icon_name === "Droplets"
                            ? "💧"
                            : s.icon_name === "ToggleRight"
                              ? "🔘"
                              : s.icon_name === "Wrench"
                                ? "🔧"
                                : s.icon_name === "PhoneCall"
                                  ? "📞"
                                  : "✨"}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-semibold text-sm">
                        {s.title}
                      </p>
                      {s.badge_text && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                          {s.badge_text}
                        </span>
                      )}
                      {!s.is_active && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                      <span className="text-xs text-sub">
                        Order: {s.order_index}
                      </span>
                    </div>
                    <p className="text-sub text-xs mt-1">
                      Animation:{" "}
                      {ANIMATION_STYLES.find(
                        (a) => a.value === s.animation_style,
                      )?.label.split(" - ")[0] || s.animation_style}
                      {s.features?.length > 0
                        ? ` · ${s.features.length} features`
                        : ""}
                    </p>
                    {s.description && (
                      <p className="text-faint text-xs mt-1 line-clamp-1">
                        {s.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDraggedServiceId(s.id)}
                      className="shrink-0 rounded-xl border border-border bg-muted p-2 text-sub hover:text-brand-500"
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </button>
                    <button
                      onClick={() => startEditService(s)}
                      className="p-2 text-sub hover:text-brand-500 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteService(s.id)}
                      className="p-2 text-sub hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {services.length === 0 && !editingService && (
                <div className="text-center py-16 text-sub">
                  <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
                  <p>
                    No services yet. Click &quot;Add Service&quot; to create your first
                    service card!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            BLOG TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "blog" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sub text-sm">{blogs.length} blog posts</p>
                <p className="text-faint text-xs mt-1">
                  Create, edit and publish your blog articles from the admin
                  dashboard.
                </p>
                {orderMessage && (
                  <p className="text-xs text-brand-600 mt-2">{orderMessage}</p>
                )}
              </div>
              <button
                onClick={startNewBlog}
                className="btn-primary text-sm px-4 py-2.5"
              >
                <Plus size={16} /> Add Post
              </button>
            </div>

            {editingBlog && (
              <div className="card p-6 mb-6 border-brand-500/20">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display font-bold text-lg">
                    {editingBlog.id ? "Edit Blog Post" : "New Blog Post"}
                  </h3>
                  <button
                    onClick={() => setEditingBlog(null)}
                    className="text-sub hover:text-ink"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Title *</label>
                      <input
                        className="input"
                        value={editingBlog.title}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Enter blog post title"
                      />
                    </div>
                    <div>
                      <label className="label">Slug</label>
                      <input
                        className="input"
                        value={editingBlog.slug}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            slug: e.target.value,
                          }))
                        }
                        placeholder="auto-generated if left blank"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category</label>
                      <input
                        className="input"
                        value={editingBlog.category}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        placeholder="e.g. Solar, Installation, Guides"
                      />
                    </div>
                    <div>
                      <label className="label">Author Name</label>
                      <input
                        className="input"
                        value={editingBlog.author || ""}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            author: e.target.value,
                          }))
                        }
                        placeholder="TruePower Team or a writer name"
                      />
                      <p className="mt-2 text-xs text-sub">
                        Leave blank and the public blog will show TruePower Team.
                      </p>
                    </div>
                    <div>
                      <label className="label">Tags (comma separated)</label>
                      <input
                        className="input"
                        value={(editingBlog.tags || []).join(", ")}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            tags: e.target.value
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean),
                          }))
                        }
                        placeholder="solar, pumps, maintenance"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Published At</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={
                          editingBlog.published_at
                            ? editingBlog.published_at.slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            published_at: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select
                        className="input"
                        value={editingBlog.status}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                      >
                        <option value="Draft">Draft</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        Order Index (lower = higher position)
                      </label>
                      <input
                        type="number"
                        className="input"
                        value={editingBlog.order_index ?? 0}
                        onChange={(e) =>
                          setEditingBlog((prev) => ({
                            ...prev,
                            order_index: parseInt(e.target.value, 10) || 0,
                          }))
                        }
                        placeholder="0, 1, 2..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Excerpt</label>
                    <textarea
                      className="input h-24 resize-none"
                      value={editingBlog.excerpt}
                      onChange={(e) =>
                        setEditingBlog((prev) => ({
                          ...prev,
                          excerpt: e.target.value,
                        }))
                      }
                      placeholder="Short summary shown on the blog list"
                    />
                  </div>

                  <div>
                    <label className="label">Featured Image</label>
                    <div className="flex flex-col sm:flex-row items-start gap-3">
                      <button
                        type="button"
                        onClick={() => blogImageRef.current?.click()}
                        className="btn-outline px-4 py-2.5"
                      >
                        <Upload size={16} /> Upload Image
                      </button>
                      {editingBlog.featured_image_url ? (
                        <img
                          src={editingBlog.featured_image_url}
                          alt="Featured"
                          className="h-20 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-20 w-40 rounded-xl bg-muted flex items-center justify-center text-sub">
                          No image selected
                        </div>
                      )}
                    </div>
                    <input
                      ref={blogImageRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBlogImageUpload}
                    />
                  </div>

                  <div>
                    <label className="label">Full Article Body *</label>
                    <BlogRichTextEditor
                      key={editingBlog.id || editingBlog.slug || "new-blog"}
                      value={editingBlog.body}
                      onChange={(value) =>
                        setEditingBlog((prev) => ({ ...prev, body: value }))
                      }
                      description="Build the article with formatted text, links, and inline image uploads. The image button inserts photos into the story wherever your cursor is."
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={saveBlogPost}
                    disabled={blogSaving}
                    className="btn-primary"
                  >
                    <Save size={16} /> {blogSaving ? "Saving..." : "Save Post"}
                  </button>
                  <button
                    onClick={() => setEditingBlog(null)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Blog list table */}
            <div className="overflow-x-auto rounded-3xl border border-border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted text-sub text-xs uppercase tracking-[0.12em]">
                  <tr>
                    <th className="px-4 py-4 w-[88px]">Order</th>
                    <th className="px-4 py-4">Title</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Published</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map((post) => {
                    const status =
                      post.status ||
                      (post.is_published ? "Published" : "Draft");
                    return (
                      <tr
                        key={post.id}
                        draggable
                        onDragStart={() => setDraggedBlogId(post.id)}
                        onDragEnd={() => {
                          setDraggedBlogId(null);
                          setDragOverBlogId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverBlogId !== post.id)
                            setDragOverBlogId(post.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleBlogDrop(post.id);
                        }}
                        className={`border-t border-border hover:bg-muted/60 ${draggedBlogId === post.id ? "opacity-60 bg-brand-50/70" : ""} ${dragOverBlogId === post.id ? "bg-brand-50" : ""}`}
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              draggable
                              onDragStart={() => setDraggedBlogId(post.id)}
                              className="shrink-0 rounded-xl border border-border bg-muted p-2 text-sub hover:text-brand-500"
                              title="Drag to reorder"
                            >
                              <GripVertical size={16} />
                            </button>
                            <span className="text-xs text-sub">
                              {post.order_index ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold text-ink truncate max-w-[240px]">
                            {post.title}
                          </p>
                          <p className="text-sub text-xs truncate max-w-[240px]">
                            {getBlogExcerpt(post, 90) || "No summary"}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top text-sub">
                          {post.category || "General"}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${status === "Published" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top text-sub">
                          {post.published_at
                            ? new Date(post.published_at).toLocaleDateString(
                                "en-KE",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </td>
                        <td className="px-4 py-4 align-top flex flex-wrap gap-2">
                          <button
                            onClick={() => startEditBlog(post)}
                            className="btn-outline px-3 py-2 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleBlogStatus(post)}
                            className="btn-ghost px-3 py-2 text-xs text-brand-600"
                          >
                            {status === "Published" ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            onClick={() => deleteBlogPost(post.id)}
                            className="btn-ghost px-3 py-2 text-xs text-red-500"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {blogs.length === 0 && (
              <div className="rounded-3xl border border-border bg-white p-12 text-center text-sub mt-2">
                <p className="text-lg font-semibold">No blog posts yet.</p>
                <p className="mt-3">
                  Click the Add Post button to start publishing articles.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TESTIMONIALS TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "testimonials" && (
          <div>
            <h3 className="font-display font-bold text-lg mb-6">
              Add Testimonial
            </h3>
            <div className="card p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name</label>
                <input
                  className="input"
                  value={tForm.name}
                  onChange={(e) =>
                    setTForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Jane M."
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input
                  className="input"
                  value={tForm.location}
                  onChange={(e) =>
                    setTForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="Nairobi"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Review Text</label>
                <textarea
                  className="input h-24 resize-none"
                  value={tForm.text}
                  onChange={(e) =>
                    setTForm((f) => ({ ...f, text: e.target.value }))
                  }
                  placeholder="Amazing product, works perfectly..."
                />
              </div>
              <div className="md:col-span-2">
                <button onClick={saveTestimonial} className="btn-primary">
                  <Save size={16} /> Save
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <p className="font-display font-semibold text-sm">
                      {t.name}{" "}
                      <span className="text-sub font-normal">
                        · {t.location}
                      </span>
                    </p>
                    <p className="text-sub text-sm mt-1 italic">&quot;{t.text}&quot;</p>
                  </div>
                  <button
                    onClick={() =>
                      deleteTestimonial(t.id).then(() =>
                        getTestimonials().then(setTestimonials),
                      )
                    }
                    className="p-2 text-sub hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            GALLERY TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "gallery" && (
          <div>
            <h3 className="font-display font-bold text-lg mb-6">
              Add Gallery Image
            </h3>
            <div className="card p-6 mb-6">
              <div className="mb-4">
                <label className="label">Image *</label>
                {galleryImageUrl ? (
                  <div className="relative inline-block mb-3">
                    <img
                      src={galleryImageUrl}
                      alt="Preview"
                      className="w-40 h-40 object-cover rounded-xl border border-border"
                    />
                    <button
                      onClick={() => setGalleryImageUrl("")}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => galleryFileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all"
                  >
                    {galleryUploading ? (
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload size={28} className="text-sub mb-2" />
                        <p className="text-sub text-sm">
                          Click to upload image
                        </p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={galleryFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setGalleryUploading(true);
                    try {
                      const url = await uploadImage(file, "gallery");
                      setGalleryImageUrl(url);
                    } catch (err) {
                      alert("Upload failed: " + err.message);
                    } finally {
                      setGalleryUploading(false);
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    className="input"
                    value={galleryForm.title}
                    onChange={(e) =>
                      setGalleryForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g. Electric shower installation – Kilimani"
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={galleryForm.category}
                    onChange={(e) =>
                      setGalleryForm((f) => ({
                        ...f,
                        category: e.target.value,
                      }))
                    }
                  >
                    <option value="installation">Installation</option>
                    <option value="showroom">Showroom</option>
                    <option value="product">Product</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Description (optional)</label>
                  <input
                    className="input"
                    value={galleryForm.description}
                    onChange={(e) =>
                      setGalleryForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Short caption shown on hover"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!galleryImageUrl)
                    return alert("Please upload an image first.");
                  try {
                    const { error } = await supabase
                      .from("gallery_images")
                      .insert({
                        image_url: galleryImageUrl,
                        title: galleryForm.title,
                        description: galleryForm.description,
                        category: galleryForm.category,
                      });
                    if (error) throw error;
                    setGalleryImageUrl("");
                    setGalleryForm({
                      title: "",
                      description: "",
                      category: "installation",
                    });
                    getGalleryImages().then(setGalleryImages);
                  } catch (err) {
                    alert("Save failed: " + err.message);
                  }
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} /> Save to Gallery
              </button>
            </div>

            <h3 className="font-display font-semibold text-base mb-3 text-sub">
              {galleryImages.length} images in gallery
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-2xl overflow-hidden border border-border"
                >
                  <img
                    src={img.image_url}
                    alt={img.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div>
                      {img.title && (
                        <p className="text-white text-xs font-semibold truncate">
                          {img.title}
                        </p>
                      )}
                      <span className="text-white/60 text-xs">
                        {img.category}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this image?")) return;
                        await supabase
                          .from("gallery_images")
                          .delete()
                          .eq("id", img.id);
                        getGalleryImages().then(setGalleryImages);
                      }}
                      className="self-end bg-red-500 hover:bg-red-600 text-white rounded-lg p-1.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {galleryImages.length === 0 && (
                <div className="col-span-4 text-center py-16 text-sub">
                  <Image size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No gallery images yet. Add your first one above!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PAGE CONTENT TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "pageContent" &&
          (() => {
            const schemas = getPageSectionSchemas();
            const makeSections = (page) =>
              Object.entries(schemas[page] || {}).map(([key, def]) => ({
                section_key: key,
                label: def.label,
                description: def.description,
                schema: def.schema,
                content: pageContent[page]?.[key] || {},
              }));
            return (
              <div className="space-y-8">
                <div className="card p-6">
                  <PageContentEditor
                    pageContent={{
                      page_slug: "about",
                      sections: makeSections("about"),
                    }}
                    onSaved={loadPageContent}
                  />
                </div>
                <div className="card p-6">
                  <PageContentEditor
                    pageContent={{
                      page_slug: "portfolio",
                      sections: makeSections("portfolio"),
                    }}
                    onSaved={loadPageContent}
                  />
                </div>
              </div>
            );
          })()}

        {/* ══════════════════════════════════════════════════════
            SETTINGS TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "settings" && (
          <div className="max-w-xl">
            <div className="flex flex-col gap-4">
              <div>
                <label className="label">
                  WhatsApp Number (with country code)
                </label>
                <input
                  className="input"
                  value={settings.whatsapp_number}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      whatsapp_number: e.target.value,
                    }))
                  }
                  placeholder="254701039256"
                />
              </div>
              <div>
                <label className="label">
                  Hero Title (use | to split lines)
                </label>
                <input
                  className="input"
                  value={settings.hero_title}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, hero_title: e.target.value }))
                  }
                  placeholder="Hot Water.|Every Morning."
                />
              </div>
              <div>
                <label className="label">Hero Subtitle</label>
                <textarea
                  className="input h-20 resize-none"
                  value={settings.hero_subtitle}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      hero_subtitle: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Customers Stat (e.g. 500+)</label>
                <input
                  className="input"
                  value={settings.stat_customers}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      stat_customers: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="label">Rating Stat (e.g. 4.9/5)</label>
                <input
                  className="input"
                  value={settings.stat_rating}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, stat_rating: e.target.value }))
                  }
                />
              </div>
              <button onClick={handleSaveSettings} className="btn-primary mt-2">
                <Save size={16} /> Save Settings
              </button>
            </div>
          </div>
        )}

        {currentTab === "analytics" && (
          <div className="space-y-8">
            <AnalyticsDashboard />
          </div>
        )}

        {currentTab === "receipt" && (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-[#eef5ff] via-white to-[#fff8d6] p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#2457d6]">Android printing</p>
                  <h2 className="font-display text-xl font-extrabold text-[#12336b] sm:text-2xl">TruePower Receipt Printer APK</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Install this app on an Android phone to connect the admin receipt builder directly to a paired Bluetooth thermal printer.</p>
                </div>
                <a
                  href="/downloads/TruePower-Receipt-Builder.apk"
                  download="TruePower-Receipt-Builder.apk"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#12336b] px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0b2858]"
                >
                  <Download size={17} /> Download APK
                </a>
              </div>
              <p className="mt-4 border-t border-blue-100 pt-3 text-xs font-medium text-slate-500">After downloading: open the APK on the Android phone, allow installation, pair the printer in Bluetooth settings, then return to Receipt Builder.</p>
            </section>
            <ReceiptBuilder />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            ADMINS TAB
        ══════════════════════════════════════════════════════ */}
        {currentTab === "admins" && (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <p className="text-sub text-sm">
                  {admins.length} admin{admins.length === 1 ? "" : "s"}
                </p>
                <h2 className="font-display font-bold text-xl">Admin users</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="Enter user email"
                  className="input w-full sm:w-[280px]"
                />
                <button
                  type="button"
                  onClick={handlePromoteAdmin}
                  disabled={adminActionLoading}
                  className="btn-primary px-4 py-2"
                >
                  Add Admin
                </button>
              </div>
            </div>
            {adminMessage && (
              <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">
                {adminMessage}
              </div>
            )}
            <div className="overflow-hidden rounded-3xl border border-border bg-white">
              {admins.length === 0 ? (
                <div className="p-6 text-center text-sub">
                  No admins added yet.
                </div>
              ) : (
                <div className="grid gap-2">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 border-b border-border last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-ink">{admin.email}</p>
                        <p className="text-sm text-sub">
                          {admin.name || "No name provided"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-semibold uppercase text-brand-700">
                          Admin
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDemoteAdmin(admin.id)}
                          disabled={adminActionLoading || admin.id === user?.id}
                          className="btn-ghost text-sm text-red-500 disabled:opacity-50"
                        >
                          {admin.id === user?.id ? "Current admin" : "Remove"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
