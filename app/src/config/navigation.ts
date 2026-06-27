import { Bot, Boxes, Home, MessageCircle, Store, Tags, UsersRound } from "lucide-react";
import { routesConfig } from "@/config/site";

export const navigationConfig = {
  dashboard: [
    { href: routesConfig.app, label: "Inicio", icon: Home },
    { href: routesConfig.storeSettings, label: "Mi tienda", icon: Store },
    { href: routesConfig.products, label: "Productos", icon: Boxes },
    { href: routesConfig.categories, label: "Categorías", icon: Tags },
    { href: routesConfig.whatsapp, label: "WhatsApp", icon: MessageCircle },
    { href: routesConfig.leads, label: "Leads", icon: UsersRound },
    { href: routesConfig.agent, label: "Seller AI", icon: Bot },
  ],
};
