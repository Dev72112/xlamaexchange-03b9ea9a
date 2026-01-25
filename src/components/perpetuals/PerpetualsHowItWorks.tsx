/**
 * Perpetuals How It Works Component
 * 
 * Educational section explaining leverage trading, margin, and liquidation
 */

import { memo } from 'react';
import { 
  TrendingUp, 
  Shield, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  Percent,
  Target,
  BarChart3
} from 'lucide-react';
import { getStaggerStyle, STAGGER_ITEM_CLASS } from '@/lib/staggerAnimation';

const concepts = [
  {
    icon: TrendingUp,
    title: 'Leverage Trading',
    description: 'Amplify your position up to 50x. With $100 and 10x leverage, you control $1,000 worth of the asset. Profits and losses are multiplied accordingly.',
    color: 'text-primary',
  },
  {
    icon: DollarSign,
    title: 'Margin & Collateral',
    description: 'Margin is the collateral you deposit to open a position. Initial margin opens the trade; maintenance margin keeps it open. If your margin falls too low, liquidation occurs.',
    color: 'text-success',
  },
  {
    icon: AlertTriangle,
    title: 'Liquidation Price',
    description: 'The price at which your position is automatically closed to prevent further losses. Higher leverage = closer liquidation price. Always set stop-losses to protect your capital.',
    color: 'text-destructive',
  },
  {
    icon: Percent,
    title: 'Funding Rates',
    description: 'Periodic payments between long and short traders to keep perpetual prices aligned with spot. If positive, longs pay shorts. Rates are settled every 8 hours.',
    color: 'text-warning',
  },
];

const tips = [
  { icon: Shield, title: 'Start Small', description: 'Use low leverage (2-5x) until you understand the mechanics' },
  { icon: Target, title: 'Use Stop-Losses', description: 'Always set SL/TP orders to manage risk automatically' },
  { icon: Clock, title: 'Watch Funding', description: 'High funding rates can erode profits over time' },
  { icon: BarChart3, title: 'Size Properly', description: "Never risk more than 1-2% of your portfolio per trade" },
];

export const PerpetualsHowItWorks = memo(function PerpetualsHowItWorks() {
  return (
    <section className="py-6 sm:py-8" aria-labelledby="perps-how-it-works-heading">
      <div className="text-center mb-6 sm:mb-8">
        <h2 id="perps-how-it-works-heading" className="text-xl sm:text-2xl font-bold mb-2">
          Understanding Perpetual Trading
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
          Perpetual contracts let you trade with leverage without expiry dates. Learn the key concepts before trading.
        </p>
      </div>

      {/* Core Concepts */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 mb-6 sm:mb-8">
        {concepts.map((concept, index) => (
          <article
            key={concept.title}
            className={`relative group ${STAGGER_ITEM_CLASS}`}
            style={getStaggerStyle(index, 80)}
          >
            <div className="bg-card rounded-xl p-4 sm:p-5 border border-border hover:border-primary/20 hover-lift transition-all duration-300 h-full sweep-effect shadow-premium-hover performance-critical overflow-hidden">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 ${concept.color}`}>
                  <concept.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">{concept.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{concept.description}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Risk Management Tips */}
      <div className="bg-secondary/30 rounded-xl p-4 sm:p-6 border border-border/50">
        <h3 className="text-base font-semibold mb-4 text-center">Risk Management Tips</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tips.map((tip, index) => (
            <div
              key={tip.title}
              className={`flex flex-col items-center text-center p-3 rounded-lg bg-background/50 ${STAGGER_ITEM_CLASS}`}
              style={getStaggerStyle(index + concepts.length, 60)}
            >
              <tip.icon className="w-5 h-5 text-primary mb-2" />
              <span className="text-xs font-medium mb-1">{tip.title}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{tip.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
        <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive font-medium">
          Leveraged trading carries significant risk. You can lose more than your initial deposit.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Only trade with funds you can afford to lose. Consider using testnet to practice first.
        </p>
      </div>
    </section>
  );
});
