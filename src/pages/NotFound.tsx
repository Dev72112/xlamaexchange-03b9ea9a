import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import xlamaMascot from "@/assets/xlama-mascot.png";
import { headerBadge, headerTitle, headerSubtitle, cardEntrance, springs } from "@/lib/animations";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div 
        className="text-center px-4 max-w-md"
        initial="initial"
        animate="animate"
      >
        {/* Animated background orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <motion.div 
            className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
        </div>
        
        {/* Mascot with enhanced animation */}
        <motion.div 
          className="relative w-32 h-32 mx-auto mb-6"
          variants={cardEntrance}
        >
          <motion.img 
            src={xlamaMascot} 
            alt="xLama mascot" 
            className="w-full h-full object-contain"
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 2, -2, 0],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>

        {/* 404 Text */}
        <motion.h1 
          className="mb-2 text-7xl font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent"
          variants={headerBadge}
        >
          404
        </motion.h1>
        
        <motion.p 
          className="mb-2 text-2xl font-semibold text-foreground"
          variants={headerTitle}
        >
          Oops! Lost in the DEX?
        </motion.p>
        
        <motion.p 
          className="mb-8 text-muted-foreground"
          variants={headerSubtitle}
        >
          This page doesn't exist or has been moved. Let's get you back on track.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
          >
            <Link 
              to="/" 
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-lg hover:shadow-primary/25"
            >
              Back to Home
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={springs.snappy}
          >
            <Link 
              to="/docs" 
              className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-all hover:bg-accent"
            >
              View Docs
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
