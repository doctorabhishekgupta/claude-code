package com.stockanalyzer;

import com.stockanalyzer.analysis.FinancialAnalyzer;
import com.stockanalyzer.gui.MainController;
import com.stockanalyzer.models.AnalysisResult;
import com.stockanalyzer.models.FinancialData;
import com.stockanalyzer.reports.ReportGenerator;
import com.stockanalyzer.scrapers.MoneycontrolScraper;
import com.stockanalyzer.scrapers.ScreenerScraper;
import com.stockanalyzer.scrapers.TickertapeScraper;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.image.Image;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.List;

/**
 * Stock Analyzer - Comprehensive Financial Analysis Tool
 *
 * A desktop application for analyzing Indian stocks using data from:
 * - Screener.in
 * - Tickertape.in
 * - Moneycontrol.com
 *
 * Usage:
 *   java -jar stock-analyzer.jar          # Launch GUI
 *   java -jar stock-analyzer.jar --cli    # Interactive CLI mode
 */
public class StockAnalyzerApp extends Application {

    private static boolean cliMode = false;
    private static String[] appArgs;

    public static void main(String[] args) {
        appArgs = args;
        List<String> argList = Arrays.asList(args);

        if (argList.contains("--cli") || argList.contains("-c")) {
            cliMode = true;
            runCli();
        } else if (argList.contains("--help") || argList.contains("-h")) {
            printHelp();
        } else {
            // Launch GUI
            launch(args);
        }
    }

    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("📊 Stock Analyzer - Comprehensive Financial Analysis");

        MainController controller = new MainController(primaryStage);
        VBox mainView = controller.createMainView();

        Scene scene = new Scene(mainView, 900, 850);

        // Apply dark theme
        scene.getRoot().setStyle("-fx-base: #1a1a2e;");

        primaryStage.setScene(scene);
        primaryStage.setMinWidth(800);
        primaryStage.setMinHeight(700);
        primaryStage.show();
    }

    private static void runCli() {
        System.out.println("=".repeat(60));
        System.out.println("📊 STOCK ANALYZER - CLI Mode");
        System.out.println("=".repeat(60));

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in))) {

            System.out.print("\nEnter Company Name: ");
            String companyName = reader.readLine().trim();

            System.out.println("\nEnter the following URLs:");
            System.out.print("1. Screener.in URL: ");
            String screenerUrl = reader.readLine().trim();

            System.out.print("2. Tickertape.in URL: ");
            String tickertapeUrl = reader.readLine().trim();

            System.out.print("3. Moneycontrol.com URL: ");
            String moneycontrolUrl = reader.readLine().trim();

            if (companyName.isEmpty() || screenerUrl.isEmpty() ||
                tickertapeUrl.isEmpty() || moneycontrolUrl.isEmpty()) {
                System.out.println("Error: All fields are required!");
                System.exit(1);
            }

            System.out.println("\n" + "-".repeat(40));
            System.out.println("Starting analysis...");
            System.out.println("-".repeat(40));

            // Fetch data
            System.out.println("\n🔄 Fetching data from Screener.in...");
            ScreenerScraper screenerScraper = new ScreenerScraper();
            FinancialData screenerData = screenerScraper.scrape(screenerUrl);
            System.out.println("✅ Screener.in data fetched");

            System.out.println("🔄 Fetching data from Tickertape.in...");
            TickertapeScraper tickertapeScraper = new TickertapeScraper();
            FinancialData tickertapeData = tickertapeScraper.scrape(tickertapeUrl);
            System.out.println("✅ Tickertape.in data fetched");

            System.out.println("🔄 Fetching data from Moneycontrol...");
            MoneycontrolScraper moneycontrolScraper = new MoneycontrolScraper();
            FinancialData moneycontrolData = moneycontrolScraper.scrape(moneycontrolUrl);
            System.out.println("✅ Moneycontrol data fetched");

            // Analyze
            System.out.println("\n🔄 Analyzing financial data...");
            FinancialAnalyzer analyzer = new FinancialAnalyzer();
            analyzer.setData(screenerData, tickertapeData, moneycontrolData);
            AnalysisResult result = analyzer.analyze(companyName);
            System.out.println("✅ Analysis complete");

            // Generate reports
            ReportGenerator reportGenerator = new ReportGenerator();
            String textReport = reportGenerator.generateTextReport(result);
            System.out.println("\n" + textReport);

            // Ask if user wants HTML report
            System.out.print("\n\nSave HTML report? (y/n): ");
            String saveHtml = reader.readLine().trim().toLowerCase();
            if (saveHtml.equals("y") || saveHtml.equals("yes")) {
                String htmlPath = reportGenerator.generateHtmlReport(result);
                System.out.println("\n✅ HTML report saved to: " + htmlPath);
            }

        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }

    private static void printHelp() {
        System.out.println("""
            Stock Analyzer - Comprehensive Financial Analysis Tool

            Usage:
              java -jar stock-analyzer.jar [options]

            Options:
              (no options)    Launch GUI application
              --cli, -c       Run in interactive CLI mode
              --help, -h      Show this help message

            Features:
              - Multi-source data aggregation (Screener.in, Tickertape.in, Moneycontrol)
              - 10-year historical analysis
              - Free Cash Flow based valuation
              - Peer comparison
              - Shareholding pattern analysis
              - Professional HTML reports

            For more information, visit the documentation.
            """);
    }
}
