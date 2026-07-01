import { Bot, Boxes, CreditCard, Home, MessageCircle, Network, Store, Tags, UsersRound } from "lucide-react";
import { routesConfig } from "@/config/site";

export const navigationConfig = {
  dashboard: [
    { href: routesConfig.app, label: "Inicio", icon: Home },
    { href: routesConfig.storeSettings, label: "Mi espacio", icon: Store },
    { href: routesConfig.products, label: "Productos", icon: Boxes },
    { href: routesConfig.categories, label: "Categorías", icon: Tags },
    { href: routesConfig.sellerAi, label: "Seller AI", icon: Bot },
    { href: routesConfig.whatsapp, label: "WhatsApp", icon: MessageCircle },
    { href: routesConfig.leads, label: "Clientes", icon: UsersRound },
    { href: routesConfig.referrals, label: "Referidos", icon: Network },
    { href: routesConfig.plan, label: "Plan", icon: CreditCard },
  ],
};
