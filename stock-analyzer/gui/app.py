"""Desktop GUI Application for Stock Analyzer."""

import customtkinter as ctk
from tkinter import messagebox, filedialog
import threading
import webbrowser
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers import ScreenerScraper, TickertapeScraper, MoneycontrolScraper
from analysis import FinancialAnalyzer
from reports import ReportGenerator


class StockAnalyzerApp(ctk.CTk):
    """Main application window for Stock Analyzer."""

    def __init__(self):
        super().__init__()

        # Configure window
        self.title("📊 Stock Analyzer - Comprehensive Financial Analysis")
        self.geometry("900x800")
        self.minsize(800, 700)

        # Set theme
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        # Initialize variables
        self.analysis_result = None
        self.is_analyzing = False

        # Build UI
        self._create_widgets()

    def _create_widgets(self):
        """Create all UI widgets."""
        # Main container
        self.main_frame = ctk.CTkFrame(self)
        self.main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # Header
        self._create_header()

        # Input Section
        self._create_input_section()

        # Progress Section
        self._create_progress_section()

        # Output Section
        self._create_output_section()

        # Buttons Section
        self._create_buttons_section()

    def _create_header(self):
        """Create header section."""
        header_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        header_frame.pack(fill="x", pady=(0, 20))

        title_label = ctk.CTkLabel(
            header_frame,
            text="📊 Stock Analyzer",
            font=ctk.CTkFont(size=28, weight="bold")
        )
        title_label.pack()

        subtitle_label = ctk.CTkLabel(
            header_frame,
            text="Comprehensive Financial Analysis Tool",
            font=ctk.CTkFont(size=14),
            text_color="gray"
        )
        subtitle_label.pack()

    def _create_input_section(self):
        """Create input fields section."""
        input_frame = ctk.CTkFrame(self.main_frame)
        input_frame.pack(fill="x", pady=10)

        # Company Name
        name_label = ctk.CTkLabel(
            input_frame,
            text="Company Name:",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        name_label.pack(anchor="w", padx=15, pady=(15, 5))

        self.company_name_entry = ctk.CTkEntry(
            input_frame,
            placeholder_text="e.g., Motilal Oswal Financial Services Ltd",
            height=40,
            font=ctk.CTkFont(size=13)
        )
        self.company_name_entry.pack(fill="x", padx=15, pady=(0, 10))

        # Screener Link
        screener_label = ctk.CTkLabel(
            input_frame,
            text="1. Screener.in Link:",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        screener_label.pack(anchor="w", padx=15, pady=(10, 5))

        self.screener_entry = ctk.CTkEntry(
            input_frame,
            placeholder_text="https://www.screener.in/company/SYMBOL/consolidated/",
            height=40,
            font=ctk.CTkFont(size=12)
        )
        self.screener_entry.pack(fill="x", padx=15, pady=(0, 10))

        # Tickertape Link
        tickertape_label = ctk.CTkLabel(
            input_frame,
            text="2. Tickertape.in Link:",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        tickertape_label.pack(anchor="w", padx=15, pady=(10, 5))

        self.tickertape_entry = ctk.CTkEntry(
            input_frame,
            placeholder_text="https://www.tickertape.in/stocks/company-name-SYMBOL",
            height=40,
            font=ctk.CTkFont(size=12)
        )
        self.tickertape_entry.pack(fill="x", padx=15, pady=(0, 10))

        # Moneycontrol Link
        moneycontrol_label = ctk.CTkLabel(
            input_frame,
            text="3. Moneycontrol.com Link:",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        moneycontrol_label.pack(anchor="w", padx=15, pady=(10, 5))

        self.moneycontrol_entry = ctk.CTkEntry(
            input_frame,
            placeholder_text="https://www.moneycontrol.com/india/stockpricequote/.../SYMBOL",
            height=40,
            font=ctk.CTkFont(size=12)
        )
        self.moneycontrol_entry.pack(fill="x", padx=15, pady=(0, 15))

    def _create_progress_section(self):
        """Create progress section."""
        self.progress_frame = ctk.CTkFrame(self.main_frame)
        self.progress_frame.pack(fill="x", pady=10)

        self.progress_label = ctk.CTkLabel(
            self.progress_frame,
            text="Ready to analyze",
            font=ctk.CTkFont(size=13)
        )
        self.progress_label.pack(pady=10)

        self.progress_bar = ctk.CTkProgressBar(self.progress_frame, width=400)
        self.progress_bar.pack(pady=(0, 15))
        self.progress_bar.set(0)

    def _create_output_section(self):
        """Create output text area."""
        output_frame = ctk.CTkFrame(self.main_frame)
        output_frame.pack(fill="both", expand=True, pady=10)

        output_label = ctk.CTkLabel(
            output_frame,
            text="Analysis Output:",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        output_label.pack(anchor="w", padx=15, pady=(10, 5))

        self.output_text = ctk.CTkTextbox(
            output_frame,
            font=ctk.CTkFont(family="Consolas", size=11),
            wrap="word"
        )
        self.output_text.pack(fill="both", expand=True, padx=15, pady=(0, 15))

    def _create_buttons_section(self):
        """Create buttons section."""
        buttons_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        buttons_frame.pack(fill="x", pady=10)

        # Analyze Button
        self.analyze_btn = ctk.CTkButton(
            buttons_frame,
            text="🔍 Analyze Stock",
            command=self._start_analysis,
            height=45,
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color="#00a86b",
            hover_color="#008c5a"
        )
        self.analyze_btn.pack(side="left", padx=5, expand=True, fill="x")

        # Export HTML Button
        self.export_html_btn = ctk.CTkButton(
            buttons_frame,
            text="📄 Export HTML Report",
            command=self._export_html,
            height=45,
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color="#2196F3",
            hover_color="#1976D2",
            state="disabled"
        )
        self.export_html_btn.pack(side="left", padx=5, expand=True, fill="x")

        # Clear Button
        self.clear_btn = ctk.CTkButton(
            buttons_frame,
            text="🗑️ Clear",
            command=self._clear_all,
            height=45,
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color="#f44336",
            hover_color="#d32f2f"
        )
        self.clear_btn.pack(side="left", padx=5, expand=True, fill="x")

    def _update_progress(self, text: str, progress: float):
        """Update progress bar and label."""
        self.progress_label.configure(text=text)
        self.progress_bar.set(progress)
        self.update_idletasks()

    def _append_output(self, text: str):
        """Append text to output area."""
        self.output_text.configure(state="normal")
        self.output_text.insert("end", text + "\n")
        self.output_text.see("end")
        self.update_idletasks()

    def _start_analysis(self):
        """Start the stock analysis in a background thread."""
        if self.is_analyzing:
            messagebox.showwarning("Warning", "Analysis already in progress!")
            return

        # Validate inputs
        company_name = self.company_name_entry.get().strip()
        screener_url = self.screener_entry.get().strip()
        tickertape_url = self.tickertape_entry.get().strip()
        moneycontrol_url = self.moneycontrol_entry.get().strip()

        if not company_name:
            messagebox.showerror("Error", "Please enter the company name")
            return

        if not screener_url or not tickertape_url or not moneycontrol_url:
            messagebox.showerror("Error", "Please enter all three data source URLs")
            return

        # Clear previous output
        self.output_text.configure(state="normal")
        self.output_text.delete("1.0", "end")

        # Disable button during analysis
        self.analyze_btn.configure(state="disabled")
        self.export_html_btn.configure(state="disabled")
        self.is_analyzing = True

        # Run analysis in background thread
        thread = threading.Thread(
            target=self._run_analysis,
            args=(company_name, screener_url, tickertape_url, moneycontrol_url)
        )
        thread.daemon = True
        thread.start()

    def _run_analysis(self, company_name: str, screener_url: str,
                      tickertape_url: str, moneycontrol_url: str):
        """Run the actual analysis (in background thread)."""
        try:
            # Step 1: Scrape Screener.in
            self.after(0, lambda: self._update_progress("Fetching data from Screener.in...", 0.1))
            self.after(0, lambda: self._append_output("🔄 Fetching data from Screener.in..."))

            screener_scraper = ScreenerScraper()
            screener_data = screener_scraper.scrape(screener_url)
            self.after(0, lambda: self._append_output("✅ Screener.in data fetched successfully"))

            # Step 2: Scrape Tickertape.in
            self.after(0, lambda: self._update_progress("Fetching data from Tickertape.in...", 0.3))
            self.after(0, lambda: self._append_output("🔄 Fetching data from Tickertape.in..."))

            tickertape_scraper = TickertapeScraper()
            tickertape_data = tickertape_scraper.scrape(tickertape_url)
            self.after(0, lambda: self._append_output("✅ Tickertape.in data fetched successfully"))

            # Step 3: Scrape Moneycontrol
            self.after(0, lambda: self._update_progress("Fetching data from Moneycontrol...", 0.5))
            self.after(0, lambda: self._append_output("🔄 Fetching data from Moneycontrol..."))

            moneycontrol_scraper = MoneycontrolScraper()
            moneycontrol_data = moneycontrol_scraper.scrape(moneycontrol_url)
            self.after(0, lambda: self._append_output("✅ Moneycontrol data fetched successfully"))

            # Step 4: Analyze data
            self.after(0, lambda: self._update_progress("Analyzing financial data...", 0.7))
            self.after(0, lambda: self._append_output("🔄 Analyzing financial data..."))

            analyzer = FinancialAnalyzer()
            analyzer.set_data(screener_data, tickertape_data, moneycontrol_data)
            self.analysis_result = analyzer.analyze(company_name)

            # Step 5: Generate report
            self.after(0, lambda: self._update_progress("Generating report...", 0.9))
            self.after(0, lambda: self._append_output("🔄 Generating report..."))

            report_generator = ReportGenerator()
            text_report = report_generator.generate_text_report(self.analysis_result)

            # Display results
            self.after(0, lambda: self._update_progress("Analysis complete!", 1.0))
            self.after(0, lambda: self._append_output("\n" + "=" * 60))
            self.after(0, lambda: self._append_output(text_report))
            self.after(0, lambda: self._append_output("\n✅ Analysis complete! You can now export the HTML report."))

            # Enable export button
            self.after(0, lambda: self.export_html_btn.configure(state="normal"))

        except Exception as e:
            error_msg = f"❌ Error during analysis: {str(e)}"
            self.after(0, lambda: self._append_output(error_msg))
            self.after(0, lambda: self._update_progress("Analysis failed", 0))
            self.after(0, lambda: messagebox.showerror("Error", str(e)))

        finally:
            self.after(0, lambda: self.analyze_btn.configure(state="normal"))
            self.is_analyzing = False

    def _export_html(self):
        """Export analysis to HTML report."""
        if not self.analysis_result:
            messagebox.showwarning("Warning", "No analysis to export. Please run analysis first.")
            return

        # Ask for save location
        file_path = filedialog.asksaveasfilename(
            defaultextension=".html",
            filetypes=[("HTML files", "*.html"), ("All files", "*.*")],
            initialfile=f"{self.analysis_result.company_name.replace(' ', '_')}_analysis.html"
        )

        if not file_path:
            return

        try:
            report_generator = ReportGenerator()
            report_generator.generate_html_report(self.analysis_result, file_path)

            # Ask to open in browser
            if messagebox.askyesno("Success", f"Report saved to:\n{file_path}\n\nOpen in browser?"):
                webbrowser.open('file://' + os.path.realpath(file_path))

        except Exception as e:
            messagebox.showerror("Error", f"Failed to export report: {str(e)}")

    def _clear_all(self):
        """Clear all inputs and outputs."""
        self.company_name_entry.delete(0, "end")
        self.screener_entry.delete(0, "end")
        self.tickertape_entry.delete(0, "end")
        self.moneycontrol_entry.delete(0, "end")

        self.output_text.configure(state="normal")
        self.output_text.delete("1.0", "end")

        self.progress_bar.set(0)
        self.progress_label.configure(text="Ready to analyze")

        self.analysis_result = None
        self.export_html_btn.configure(state="disabled")


def main():
    """Main entry point."""
    app = StockAnalyzerApp()
    app.mainloop()


if __name__ == "__main__":
    main()
