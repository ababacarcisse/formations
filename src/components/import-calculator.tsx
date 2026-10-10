"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { money } from "@/lib/format";
export function ImportCalculator() {
  const [values, setValues] = useState({
    product: 0,
    transport: 0,
    customs: 0,
    fees: 0,
    quantity: 1,
    margin: 30,
  });
  const total =
      values.product + values.transport + values.customs + values.fees,
    unit = total / Math.max(1, values.quantity),
    price = unit / (1 - Math.min(95, values.margin) / 100);
  return (
    <motion.article className="card" initial={false} layout="position">
      <h2>Coût de revient d’import</h2>
      <p>
        Estimation : renseignez les coûts de l’ensemble du lot. Les taxes
        dépendent du produit et du pays.
      </p>
      <div className="form">
        {(
          [
            ["product", "Prix du lot"],
            ["transport", "Transport"],
            ["customs", "Douane"],
            ["fees", "Autres frais"],
            ["quantity", "Quantité de produits"],
            ["margin", "Marge sur le prix de vente (%)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={key === "quantity" ? 1 : 0}
              max={key === "margin" ? 95 : 1e9}
              step={key === "quantity" ? 1 : "0.01"}
              value={values[key]}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [key]: Math.max(
                    key === "quantity" ? 1 : 0,
                    Number(e.target.value) || 0,
                  ),
                }))
              }
            />
          </label>
        ))}
      </div>
      <p>
        Coût total : <b>{money(total)}</b>
      </p>
      <p>
        Coût unitaire : <b>{money(unit)}</b>
      </p>
      <p>
        Prix conseillé : <b>{money(Math.ceil(price))}</b>
      </p>
      <p>
        Marge = bénéfice brut / prix de vente. Ce calcul ne prévoit pas vos
        autres dépenses d’exploitation.
      </p>
    </motion.article>
  );
}
