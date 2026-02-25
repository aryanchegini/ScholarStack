import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => {
        const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
        setTheme(nextTheme)
    }

    return (
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === "light" && <Sun className="h-5 w-5 transition-all" />}
            {theme === "dark" && <Moon className="h-5 w-5 transition-all" />}
            {theme === "system" && <div className="relative h-5 w-5">
                <Sun className="h-5 w-5 absolute top-0 left-0 dark:opacity-0 opacity-100 transition-all" />
                <Moon className="h-5 w-5 absolute top-0 left-0 dark:opacity-100 opacity-0 transition-all" />
            </div>}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
