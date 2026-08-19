import { cartridge } from "@/brand/cartridge";

/**
 * CartridgeVars — the nav accent flip (S8, cartridge hardening). With
 * cartridge.nav.accent "gold" (Love's original, the onecocreation default)
 * this renders NOTHING — the output stays byte-identical to the shipped
 * nav. With "dawn" (the kit's rose→lavender retint, Version A, navfix 10a)
 * it pours the --nav-dawn-* recipe from cartridge.css over the four
 * consumed nav tokens; house.css never forks, and gold stays with money +
 * the coin mark. Rendered once in the root layout's body, after the
 * cartridge/house stylesheet links, so its :root wins by cascade order.
 */
export default function CartridgeVars() {
  if (cartridge.nav.accent !== "dawn") return null;
  return (
    <style
      data-oc-cartridge-vars=""
      dangerouslySetInnerHTML={{
        __html:
          ":root{" +
          "--nav-gold:var(--nav-dawn-link);" +
          "--nav-hover:var(--nav-dawn-hover);" +
          "--here-grad:var(--nav-dawn-grad);" +
          "--here-wash:var(--nav-dawn-wash)" +
          "}",
      }}
    />
  );
}
