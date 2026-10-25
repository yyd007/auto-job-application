// Loaded as text and evaluated inside the page. Node does not call it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scrapeQuestions() {
  function textOf(node) {
    return (node && node.textContent ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function visible(el) {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const box = el.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  }

  function fieldLabel(el) {
    if (el.id) {
      const linked = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (linked) {
        const clone = linked.cloneNode(true);
        clone.querySelectorAll("input, select, textarea, button").forEach((node) => node.remove());
        const linkedText = textOf(clone);
        if (linkedText) return linkedText;
      }
    }
    const wrapping = el.closest("label");
    if (wrapping) {
      const clone = wrapping.cloneNode(true);
      clone.querySelectorAll("input, select, textarea, button").forEach((node) => node.remove());
      const wrappingText = textOf(clone);
      if (wrappingText) return wrappingText;
    }
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const combined = labelledBy
        .split(/\s+/)
        .map((id) => textOf(document.getElementById(id)))
        .filter(Boolean)
        .join(" ");
      if (combined) return combined;
    }
    const legend = el.closest("fieldset") && el.closest("fieldset").querySelector("legend");
    if (legend && textOf(legend)) return textOf(legend);
    const placeholder = el.getAttribute("placeholder");
    if (placeholder && placeholder.trim()) return placeholder.trim();
    return "";
  }

  function sectionOf(el) {
    const fieldset = el.closest("fieldset");
    const legend = fieldset ? fieldset.querySelector("legend") : null;
    if (legend && textOf(legend)) return textOf(legend);
    let node = el;
    for (let depth = 0; depth < 6 && node; depth += 1) {
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (/^H[1-3]$/.test(sibling.tagName) && textOf(sibling)) return textOf(sibling);
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }
    return "";
  }

  function requiredOf(el, label) {
    if (/可选|optional/i.test(label)) return false;
    if (el.required || el.getAttribute("aria-required") === "true") return true;
    if (/必填|\*/.test(label)) return true;
    return false;
  }

  function verifiedOf(el, label) {
    if (/已验证|verified/i.test(label)) return true;
    const parent = el.parentElement;
    if (!parent) return false;
    const nearby = (parent.innerText || "").replace(/\s+/g, " ").trim();
    if (nearby.length > 180) return false;
    return /已验证|verified/i.test(nearby);
  }

  function skipField(el) {
    if (el.closest("header, nav, footer")) return true;
    const type = (el.getAttribute("type") || "").toLowerCase();
    if (type === "search" || type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "image") {
      return true;
    }
    const name = (el.getAttribute("name") || "").toLowerCase();
    if (name === "q" || name === "query" || name === "search") return true;
    return false;
  }

  const questions = [];
  const used = new Set();
  const radios = [...document.querySelectorAll("input[type=radio]")].filter((el) => visible(el) && !skipField(el));
  const groups = new Map();
  for (const radio of radios) {
    const name = radio.name || radio.id || `radio-${questions.length}`;
    const group = groups.get(name) || [];
    group.push(radio);
    groups.set(name, group);
    used.add(radio);
  }

  for (const [name, group] of groups) {
    const first = group[0];
    const fieldset = first.closest("fieldset");
    let label = textOf(fieldset ? fieldset.querySelector("legend") : null);
    const radiogroup = first.closest("[role=radiogroup]");
    if (!label && radiogroup && radiogroup.getAttribute("aria-label")) label = radiogroup.getAttribute("aria-label") || "";
    if (!label) {
      let parent = first.parentElement;
      for (let depth = 0; depth < 4 && parent && !label; depth += 1) {
        let sibling = parent.previousElementSibling;
        while (sibling && !label) {
          const siblingText = textOf(sibling);
          if (siblingText && siblingText.length < 220 && !/^(是|否|yes|no)$/i.test(siblingText)) label = siblingText;
          sibling = sibling.previousElementSibling;
        }
        parent = parent.parentElement;
      }
    }
    const options = group.map((radio) => fieldLabel(radio) || radio.value).filter(Boolean);
    const checked = group.find((radio) => radio.checked);
    questions.push({
      id: `radio:${name}`,
      label: label || name,
      section: sectionOf(first),
      required: group.some((radio) => radio.required || radio.getAttribute("aria-required") === "true") || /必填|\*/.test(label),
      kind: "radio",
      options,
      currentValue: checked ? checked.value || fieldLabel(checked) : "",
      verified: false,
    });
  }

  const fields = [...document.querySelectorAll("input, textarea, select")].filter(
    (el) => !used.has(el) && visible(el) && !skipField(el),
  );

  for (const el of fields) {
    const type = (el.getAttribute("type") || el.tagName).toLowerCase();
    const label = fieldLabel(el) || el.name || "(unlabeled field)";
    let kind = "text";
    if (el.tagName === "TEXTAREA") kind = "textarea";
    else if (el.tagName === "SELECT") kind = "select";
    else if (["email", "tel", "password", "file", "checkbox", "date", "number"].includes(type)) kind = type;

    const options = el.tagName === "SELECT" ? [...el.options].map((option) => (option.textContent || "").trim()).filter(Boolean) : [];
    let currentValue = "";
    if (el.tagName === "SELECT") {
      const selected = el.options[el.selectedIndex];
      const selectedText = (selected && selected.textContent ? selected.textContent : "").trim();
      if (selected && selected.value && !/请选择|select/i.test(selectedText)) currentValue = selectedText;
    } else if (type !== "password" && type !== "file") {
      currentValue = el.value || "";
    }

    questions.push({
      id: `${kind}:${el.name || el.id || label}:${questions.length}`,
      label,
      section: sectionOf(el),
      required: requiredOf(el, label),
      kind,
      options,
      currentValue,
      verified: verifiedOf(el, label),
    });
  }

  return questions;
}
