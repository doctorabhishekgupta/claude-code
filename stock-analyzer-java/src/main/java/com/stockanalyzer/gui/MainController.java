package com.stockanalyzer.gui;

import com.stockanalyzer.analysis.FinancialAnalyzer;
import com.stockanalyzer.models.AnalysisResult;
import com.stockanalyzer.models.FinancialData;
import com.stockanalyzer.reports.ReportGenerator;
import com.stockanalyzer.scrapers.MoneycontrolScraper;
import com.stockanalyzer.scrapers.ScreenerScraper;
import com.stockanalyzer.scrapers.TickertapeScraper;

import javafx.application.Platform;
import javafx.concurrent.Task;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.awt.Desktop;
import java.io.File;
import java.io.IOException;

/**
 * Main controller for the Stock Analyzer GUI.
 */
public class MainController {

    private Stage stage;
    private TextField companyNameField;
    private TextField screenerUrlField;
    private TextField tickertapeUrlField;
    private TextField moneycontrolUrlField;
    private TextArea outputArea;
    private ProgressBar progressBar;
    private Label statusLabel;
    private Button analyzeButton;
    private Button exportButton;

    private AnalysisResult currentResult;
    private boolean isAnalyzing = false;

    public MainController(Stage stage) {
        this.stage = stage;
    }

    public VBox createMainView() {
        VBox mainContainer = new VBox(20);
        mainContainer.setPadding(new Insets(20));
        mainContainer.setStyle("-fx-background-color: linear-gradient(to bottom right, #1a1a2e, #16213e);");

        // Header
        mainContainer.getChildren().add(createHeader());

        // Input Section
        mainContainer.getChildren().add(createInputSection());

        // Progress Section
        mainContainer.getChildren().add(createProgressSection());

        // Output Section
        VBox outputSection = createOutputSection();
        VBox.setVgrow(outputSection, Priority.ALWAYS);
        mainContainer.getChildren().add(outputSection);

        // Buttons Section
        mainContainer.getChildren().add(createButtonsSection());

        return mainContainer;
    }

    private VBox createHeader() {
        VBox header = new VBox(5);
        header.setAlignment(Pos.CENTER);
        header.setPadding(new Insets(10));
        header.setStyle("-fx-background-color: rgba(255,255,255,0.05); -fx-background-radius: 10;");

        Label title = new Label("📊 Stock Analyzer");
        title.setFont(Font.font("System", FontWeight.BOLD, 28));
        title.setTextFill(Color.web("#00d4ff"));

        Label subtitle = new Label("Comprehensive Financial Analysis Tool");
        subtitle.setFont(Font.font("System", 14));
        subtitle.setTextFill(Color.GRAY);

        header.getChildren().addAll(title, subtitle);
        return header;
    }

    private VBox createInputSection() {
        VBox inputSection = new VBox(10);
        inputSection.setPadding(new Insets(15));
        inputSection.setStyle("-fx-background-color: rgba(255,255,255,0.05); -fx-background-radius: 10;");

        // Company Name
        Label nameLabel = createLabel("Company Name:");
        companyNameField = createTextField("e.g., Motilal Oswal Financial Services Ltd");

        // Screener URL
        Label screenerLabel = createLabel("1. Screener.in Link:");
        screenerUrlField = createTextField("https://www.screener.in/company/SYMBOL/consolidated/");

        // Tickertape URL
        Label tickertapeLabel = createLabel("2. Tickertape.in Link:");
        tickertapeUrlField = createTextField("https://www.tickertape.in/stocks/company-name-SYMBOL");

        // Moneycontrol URL
        Label moneycontrolLabel = createLabel("3. Moneycontrol.com Link:");
        moneycontrolUrlField = createTextField("https://www.moneycontrol.com/india/stockpricequote/.../SYMBOL");

        inputSection.getChildren().addAll(
                nameLabel, companyNameField,
                screenerLabel, screenerUrlField,
                tickertapeLabel, tickertapeUrlField,
                moneycontrolLabel, moneycontrolUrlField
        );

        return inputSection;
    }

    private Label createLabel(String text) {
        Label label = new Label(text);
        label.setFont(Font.font("System", FontWeight.BOLD, 14));
        label.setTextFill(Color.WHITE);
        return label;
    }

    private TextField createTextField(String prompt) {
        TextField field = new TextField();
        field.setPromptText(prompt);
        field.setStyle("""
            -fx-background-color: rgba(255,255,255,0.1);
            -fx-text-fill: white;
            -fx-prompt-text-fill: gray;
            -fx-background-radius: 5;
            -fx-padding: 10;
            """);
        field.setPrefHeight(40);
        return field;
    }

    private VBox createProgressSection() {
        VBox progressSection = new VBox(10);
        progressSection.setPadding(new Insets(15));
        progressSection.setStyle("-fx-background-color: rgba(255,255,255,0.05); -fx-background-radius: 10;");

        statusLabel = new Label("Ready to analyze");
        statusLabel.setFont(Font.font("System", 13));
        statusLabel.setTextFill(Color.WHITE);

        progressBar = new ProgressBar(0);
        progressBar.setPrefWidth(Double.MAX_VALUE);
        progressBar.setStyle("-fx-accent: #00d4ff;");

        progressSection.getChildren().addAll(statusLabel, progressBar);
        return progressSection;
    }

    private VBox createOutputSection() {
        VBox outputSection = new VBox(10);
        outputSection.setPadding(new Insets(15));
        outputSection.setStyle("-fx-background-color: rgba(255,255,255,0.05); -fx-background-radius: 10;");

        Label outputLabel = createLabel("Analysis Output:");

        outputArea = new TextArea();
        outputArea.setEditable(false);
        outputArea.setWrapText(true);
        outputArea.setStyle("""
            -fx-control-inner-background: #1a1a2e;
            -fx-text-fill: #00ff88;
            -fx-font-family: 'Consolas', 'Monaco', monospace;
            -fx-font-size: 12px;
            """);
        VBox.setVgrow(outputArea, Priority.ALWAYS);

        outputSection.getChildren().addAll(outputLabel, outputArea);
        VBox.setVgrow(outputSection, Priority.ALWAYS);
        return outputSection;
    }

    private HBox createButtonsSection() {
        HBox buttonSection = new HBox(10);
        buttonSection.setAlignment(Pos.CENTER);
        buttonSection.setPadding(new Insets(10));

        analyzeButton = createButton("🔍 Analyze Stock", "#00a86b", "#008c5a");
        analyzeButton.setOnAction(e -> startAnalysis());

        exportButton = createButton("📄 Export HTML Report", "#2196F3", "#1976D2");
        exportButton.setOnAction(e -> exportHtmlReport());
        exportButton.setDisable(true);

        Button clearButton = createButton("🗑️ Clear", "#f44336", "#d32f2f");
        clearButton.setOnAction(e -> clearAll());

        buttonSection.getChildren().addAll(analyzeButton, exportButton, clearButton);
        HBox.setHgrow(analyzeButton, Priority.ALWAYS);
        HBox.setHgrow(exportButton, Priority.ALWAYS);
        HBox.setHgrow(clearButton, Priority.ALWAYS);

        return buttonSection;
    }

    private Button createButton(String text, String bgColor, String hoverColor) {
        Button button = new Button(text);
        button.setMaxWidth(Double.MAX_VALUE);
        button.setPrefHeight(45);
        button.setFont(Font.font("System", FontWeight.BOLD, 14));
        button.setTextFill(Color.WHITE);
        button.setStyle(String.format("""
            -fx-background-color: %s;
            -fx-background-radius: 8;
            -fx-cursor: hand;
            """, bgColor));

        button.setOnMouseEntered(e ->
            button.setStyle(String.format("-fx-background-color: %s; -fx-background-radius: 8; -fx-cursor: hand;", hoverColor))
        );
        button.setOnMouseExited(e ->
            button.setStyle(String.format("-fx-background-color: %s; -fx-background-radius: 8; -fx-cursor: hand;", bgColor))
        );

        return button;
    }

    private void startAnalysis() {
        if (isAnalyzing) {
            showAlert(Alert.AlertType.WARNING, "Analysis in Progress", "Please wait for the current analysis to complete.");
            return;
        }

        String companyName = companyNameField.getText().trim();
        String screenerUrl = screenerUrlField.getText().trim();
        String tickertapeUrl = tickertapeUrlField.getText().trim();
        String moneycontrolUrl = moneycontrolUrlField.getText().trim();

        if (companyName.isEmpty()) {
            showAlert(Alert.AlertType.ERROR, "Error", "Please enter the company name.");
            return;
        }

        if (screenerUrl.isEmpty() || tickertapeUrl.isEmpty() || moneycontrolUrl.isEmpty()) {
            showAlert(Alert.AlertType.ERROR, "Error", "Please enter all three data source URLs.");
            return;
        }

        outputArea.clear();
        analyzeButton.setDisable(true);
        exportButton.setDisable(true);
        isAnalyzing = true;

        Task<AnalysisResult> analysisTask = new Task<>() {
            @Override
            protected AnalysisResult call() throws Exception {
                updateMessage("Fetching data from Screener.in...");
                updateProgress(0.1, 1.0);
                Platform.runLater(() -> appendOutput("🔄 Fetching data from Screener.in..."));

                ScreenerScraper screenerScraper = new ScreenerScraper();
                FinancialData screenerData = screenerScraper.scrape(screenerUrl);
                Platform.runLater(() -> appendOutput("✅ Screener.in data fetched"));

                updateMessage("Fetching data from Tickertape.in...");
                updateProgress(0.3, 1.0);
                Platform.runLater(() -> appendOutput("🔄 Fetching data from Tickertape.in..."));

                TickertapeScraper tickertapeScraper = new TickertapeScraper();
                FinancialData tickertapeData = tickertapeScraper.scrape(tickertapeUrl);
                Platform.runLater(() -> appendOutput("✅ Tickertape.in data fetched"));

                updateMessage("Fetching data from Moneycontrol...");
                updateProgress(0.5, 1.0);
                Platform.runLater(() -> appendOutput("🔄 Fetching data from Moneycontrol..."));

                MoneycontrolScraper moneycontrolScraper = new MoneycontrolScraper();
                FinancialData moneycontrolData = moneycontrolScraper.scrape(moneycontrolUrl);
                Platform.runLater(() -> appendOutput("✅ Moneycontrol data fetched"));

                updateMessage("Analyzing financial data...");
                updateProgress(0.7, 1.0);
                Platform.runLater(() -> appendOutput("🔄 Analyzing financial data..."));

                FinancialAnalyzer analyzer = new FinancialAnalyzer();
                analyzer.setData(screenerData, tickertapeData, moneycontrolData);
                AnalysisResult result = analyzer.analyze(companyName);

                updateMessage("Generating report...");
                updateProgress(0.9, 1.0);
                Platform.runLater(() -> appendOutput("🔄 Generating report..."));

                ReportGenerator reportGenerator = new ReportGenerator();
                String textReport = reportGenerator.generateTextReport(result);

                Platform.runLater(() -> {
                    appendOutput("\n" + "=".repeat(60));
                    appendOutput(textReport);
                    appendOutput("\n✅ Analysis complete! You can now export the HTML report.");
                });

                updateProgress(1.0, 1.0);
                updateMessage("Analysis complete!");

                return result;
            }
        };

        analysisTask.setOnSucceeded(e -> {
            currentResult = analysisTask.getValue();
            exportButton.setDisable(false);
            analyzeButton.setDisable(false);
            isAnalyzing = false;
        });

        analysisTask.setOnFailed(e -> {
            Throwable ex = analysisTask.getException();
            appendOutput("❌ Error during analysis: " + ex.getMessage());
            statusLabel.setText("Analysis failed");
            progressBar.setProgress(0);
            analyzeButton.setDisable(false);
            isAnalyzing = false;
        });

        statusLabel.textProperty().bind(analysisTask.messageProperty());
        progressBar.progressProperty().bind(analysisTask.progressProperty());

        Thread thread = new Thread(analysisTask);
        thread.setDaemon(true);
        thread.start();
    }

    private void exportHtmlReport() {
        if (currentResult == null) {
            showAlert(Alert.AlertType.WARNING, "Warning", "No analysis to export. Please run analysis first.");
            return;
        }

        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Save HTML Report");
        fileChooser.getExtensionFilters().add(
                new FileChooser.ExtensionFilter("HTML Files", "*.html")
        );
        fileChooser.setInitialFileName(currentResult.getCompanyName().replaceAll("[^a-zA-Z0-9]", "_") + "_analysis.html");

        File file = fileChooser.showSaveDialog(stage);
        if (file == null) return;

        try {
            ReportGenerator reportGenerator = new ReportGenerator();
            String path = reportGenerator.generateHtmlReport(currentResult, file.getAbsolutePath());

            Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
            alert.setTitle("Success");
            alert.setHeaderText("Report saved successfully!");
            alert.setContentText("Report saved to:\n" + path + "\n\nOpen in browser?");

            ButtonType openButton = new ButtonType("Open");
            ButtonType closeButton = new ButtonType("Close", ButtonBar.ButtonData.CANCEL_CLOSE);
            alert.getButtonTypes().setAll(openButton, closeButton);

            alert.showAndWait().ifPresent(response -> {
                if (response == openButton) {
                    try {
                        Desktop.getDesktop().browse(file.toURI());
                    } catch (IOException ex) {
                        showAlert(Alert.AlertType.ERROR, "Error", "Could not open browser: " + ex.getMessage());
                    }
                }
            });

        } catch (IOException ex) {
            showAlert(Alert.AlertType.ERROR, "Error", "Failed to save report: " + ex.getMessage());
        }
    }

    private void clearAll() {
        companyNameField.clear();
        screenerUrlField.clear();
        tickertapeUrlField.clear();
        moneycontrolUrlField.clear();
        outputArea.clear();
        progressBar.progressProperty().unbind();
        progressBar.setProgress(0);
        statusLabel.textProperty().unbind();
        statusLabel.setText("Ready to analyze");
        currentResult = null;
        exportButton.setDisable(true);
    }

    private void appendOutput(String text) {
        outputArea.appendText(text + "\n");
    }

    private void showAlert(Alert.AlertType type, String title, String content) {
        Alert alert = new Alert(type);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(content);
        alert.showAndWait();
    }
}
