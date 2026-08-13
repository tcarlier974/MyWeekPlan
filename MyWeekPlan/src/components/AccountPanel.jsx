import { AnimatePresence, motion } from 'framer-motion'
import { LogIn, LogOut, X } from 'lucide-react'
import { getAccountPanelView } from '../lib/authUi'

export default function AccountPanel({ isOpen, onClose, user, isAuthLoading, onSignIn, onSignOut }) {
  const view = getAccountPanelView(user)
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Mon profil'
  const avatar = user?.user_metadata?.avatar_url

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[200]" initial="initial" animate="animate" exit="exit">
          <motion.button aria-label="Fermer le panneau compte" className="absolute inset-0 bg-foreground/45 backdrop-blur-sm" variants={{ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }} onClick={onClose} />
          <motion.aside
            aria-label={view === 'login' ? 'Connexion' : 'Profil'}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-background border-l-[3px] border-foreground p-6 sm:p-8 flex flex-col"
            variants={{ initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <button onClick={onClose} className="self-end w-12 h-12 brutal-border bg-white flex items-center justify-center hover:bg-primary" aria-label="Fermer"><X size={24} strokeWidth={3} /></button>
            {isAuthLoading ? <p className="mt-12 font-bold uppercase tracking-widest">Chargement…</p> : view === 'login' ? (
              <div className="my-auto">
                <p className="font-display font-bold uppercase tracking-[0.25em] text-primary text-sm mb-4">Mon espace</p>
                <h2 className="text-5xl font-black uppercase leading-none">Sauvegarde<br />ta semaine.</h2>
                <p className="font-bold text-muted-foreground mt-6 leading-relaxed">Connecte-toi avec Google pour retrouver ton frigo, ton menu et ta liste de courses sur tous tes appareils.</p>
                <button className="brutal-btn w-full mt-10 py-5 flex items-center justify-center gap-3" onClick={onSignIn}><LogIn size={22} strokeWidth={3} /> Continuer avec Google</button>
                <p className="text-sm font-bold text-muted-foreground mt-5">Tu peux aussi continuer en mode essai : tes données resteront seulement sur cet appareil.</p>
              </div>
            ) : (
              <div className="my-auto">
                <p className="font-display font-bold uppercase tracking-[0.25em] text-primary text-sm mb-6">Mon profil</p>
                <div className="brutal-border bg-white p-6">
                  {avatar ? <img src={avatar} alt="" className="w-20 h-20 brutal-border object-cover mb-6" /> : <div className="w-20 h-20 brutal-border bg-primary flex items-center justify-center text-3xl font-black mb-6">{fullName.charAt(0)}</div>}
                  <h2 className="text-3xl font-black uppercase leading-none">{fullName}</h2>
                  <p className="font-bold text-muted-foreground mt-3 break-all">{user.email}</p>
                </div>
                <button className="brutal-btn w-full mt-8 py-4 bg-white text-foreground hover:bg-primary flex items-center justify-center gap-3" onClick={onSignOut}><LogOut size={21} strokeWidth={3} /> Se déconnecter</button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
