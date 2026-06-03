"""
DataMediator Pro - Export et Reporting Avancé
Système complet de génération de rapports et d'exports multi-formats
"""

import io
import csv
import json
import time
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import pandas as pd
from jinja2 import Template

# Pour les exports PDF (optionnel)
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

# Pour les exports Excel (optionnel)
try:
    import xlsxwriter
    XLSX_AVAILABLE = True
except ImportError:
    XLSX_AVAILABLE = False

logger = logging.getLogger(__name__)

class ReportFormat(Enum):
    CSV = "csv"
    JSON = "json"
    PDF = "pdf"
    EXCEL = "xlsx"
    HTML = "html"

class ReportType(Enum):
    DATA_EXPORT = "data_export"
    ANALYTICS_REPORT = "analytics_report"
    PERFORMANCE_REPORT = "performance_report"
    USER_ACTIVITY_REPORT = "user_activity_report"
    CONFLICT_REPORT = "conflict_report"

@dataclass
class ReportConfig:
    """Configuration de génération de rapport"""
    report_type: ReportType
    format: ReportFormat
    title: str
    description: str
    filters: Dict[str, Any] = None
    columns: List[str] = None
    include_charts: bool = False
    include_metadata: bool = True
    template: Optional[str] = None
    custom_options: Dict[str, Any] = None

@dataclass
class ReportData:
    """Données pour le rapport"""
    data: List[Dict[str, Any]]
    metadata: Dict[str, Any] = None
    charts: List[Dict[str, Any]] = None
    summary: Dict[str, Any] = None

class ReportGenerator:
    """Générateur de rapports"""
    
    def __init__(self):
        self.templates = {}
        self.load_default_templates()
    
    def load_default_templates(self):
        """Charge les templates par défaut"""
        self.templates = {
            "analytics": """
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f2f2f2; }
        .metadata { font-size: 12px; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
        <p>Généré le: {{ generated_at }}</p>
    </div>
    
    {% if summary %}
    <div class="summary">
        <h2>Résumé</h2>
        {% for key, value in summary.items() %}
        <p><strong>{{ key }}:</strong> {{ value }}</p>
        {% endfor %}
    </div>
    {% endif %}
    
    <div class="data-section">
        <h2>Données</h2>
        <table class="data-table">
            <thead>
                <tr>
                    {% for column in columns %}
                    <th>{{ column }}</th>
                    {% endfor %}
                </tr>
            </thead>
            <tbody>
                {% for row in data %}
                <tr>
                    {% for column in columns %}
                    <td>{{ row[column] }}</td>
                    {% endfor %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
    
    {% if include_metadata and metadata %}
    <div class="metadata">
        <h2>Métadonnées</h2>
        {% for key, value in metadata.items() %}
        <p><strong>{{ key }}:</strong> {{ value }}</p>
        {% endfor %}
    </div>
    {% endif %}
</body>
</html>
            """,
            
            "simple": """
# {{ title }}

{{ description }}

Généré le: {{ generated_at }}

## Résumé
{% if summary %}
{% for key, value in summary.items() %}
- **{{ key }}**: {{ value }}
{% endfor %}
{% endif %}

## Données
{% for column in columns %}
{{ column }}{% if not loop.last %} | {% endif %}
{% endfor %}
{% for row in data %}
{% for column in columns %}
{{ row[column] }}{% if not loop.last %} | {% endif %}
{% endfor %}
{% endfor %}
            """
        }
    
    def generate_report(self, config: ReportConfig, data: ReportData) -> bytes:
        """Génère un rapport selon la configuration"""
        
        if config.format == ReportFormat.CSV:
            return self._generate_csv(config, data)
        elif config.format == ReportFormat.JSON:
            return self._generate_json(config, data)
        elif config.format == ReportFormat.HTML:
            return self._generate_html(config, data)
        elif config.format == ReportFormat.PDF:
            return self._generate_pdf(config, data)
        elif config.format == ReportFormat.EXCEL:
            return self._generate_excel(config, data)
        else:
            raise ValueError(f"Format non supporté: {config.format}")
    
    def _generate_csv(self, config: ReportConfig, data: ReportData) -> bytes:
        """Génère un rapport CSV"""
        output = io.StringIO()
        
        if data.data and config.columns:
            writer = csv.DictWriter(output, fieldnames=config.columns, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(data.data)
        else:
            writer = csv.writer(output)
            # En-tête
            writer.writerow([config.title])
            writer.writerow([config.description])
            writer.writerow([f"Généré le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
            writer.writerow([])
            
            # Données
            if data.data:
                headers = list(data.data[0].keys()) if data.data else []
                writer.writerow(headers)
                for row in data.data:
                    writer.writerow([row.get(h, "") for h in headers])
        
        return output.getvalue().encode('utf-8')
    
    def _generate_json(self, config: ReportConfig, data: ReportData) -> bytes:
        """Génère un rapport JSON"""
        report = {
            "metadata": {
                "title": config.title,
                "description": config.description,
                "generated_at": datetime.now().isoformat(),
                "report_type": config.report_type.value,
                "format": config.format.value
            },
            "data": data.data,
            "columns": config.columns,
            "row_count": len(data.data) if data.data else 0
        }
        
        if data.summary:
            report["summary"] = data.summary
        
        if data.metadata:
            report["source_metadata"] = data.metadata
        
        return json.dumps(report, indent=2, default=str, ensure_ascii=False).encode('utf-8')
    
    def _generate_html(self, config: ReportConfig, data: ReportData) -> bytes:
        """Génère un rapport HTML"""
        template_name = config.template or "analytics"
        template_str = self.templates.get(template_name, self.templates["analytics"])
        template = Template(template_str)
        
        html_content = template.render(
            title=config.title,
            description=config.description,
            generated_at=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            data=data.data,
            columns=config.columns or (list(data.data[0].keys()) if data.data else []),
            summary=data.summary,
            metadata=data.metadata,
            include_metadata=config.include_metadata
        )
        
        return html_content.encode('utf-8')
    
    def _generate_pdf(self, config: ReportConfig, data: ReportData) -> bytes:
        """Génère un rapport PDF"""
        if not REPORTLAB_AVAILABLE:
            logger.warning("ReportLab non disponible, génération PDF basique")
            # Fallback: générer HTML et convertir en texte simple
            html_content = self._generate_html(config, data).decode('utf-8')
            return html_content.encode('utf-8')
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1  # center
        )
        
        story = []
        
        # Titre
        story.append(Paragraph(config.title, title_style))
        story.append(Spacer(1, 12))
        
        # Description
        story.append(Paragraph(config.description, styles['Normal']))
        story.append(Paragraph(f"Généré le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Résumé
        if data.summary:
            story.append(Paragraph("Résumé", styles['Heading2']))
            for key, value in data.summary.items():
                story.append(Paragraph(f"<b>{key}:</b> {value}", styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Tableau de données
        if data.data and config.columns:
            story.append(Paragraph("Données", styles['Heading2']))
            
            # Préparer les données du tableau
            table_data = [config.columns]  # En-tête
            for row in data.data:
                table_row = [str(row.get(col, "")) for col in config.columns]
                table_data.append(table_row)
            
            # Créer le tableau
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(table)
        
        # Métadonnées
        if config.include_metadata and data.metadata:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Métadonnées", styles['Heading2']))
            for key, value in data.metadata.items():
                story.append(Paragraph(f"<b>{key}:</b> {value}", styles['Normal']))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _generate_excel(self, config: ReportConfig, data: ReportData) -> bytes:
        """Génère un rapport Excel"""
        if not XLSX_AVAILABLE:
            logger.warning("XLSXWriter non disponible, génération CSV fallback")
            return self._generate_csv(config, data)
        
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        
        # Feuille principale
        worksheet = workbook.add_worksheet('Rapport')
        
        # Styles
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D7E4BD',
            'border': 1
        })
        
        title_format = workbook.add_format({
            'bold': True,
            'font_size': 16,
            'align': 'center'
        })
        
        # Titre
        worksheet.write(0, 0, config.title, title_format)
        worksheet.write(1, 0, config.description)
        worksheet.write(2, 0, f"Généré le: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        row = 4
        
        # Résumé
        if data.summary:
            worksheet.write(row, 0, "Résumé", workbook.add_format({'bold': True}))
            row += 1
            for key, value in data.summary.items():
                worksheet.write(row, 0, key)
                worksheet.write(row, 1, str(value))
                row += 1
            row += 1
        
        # Données
        if data.data and config.columns:
            worksheet.write(row, 0, "Données", workbook.add_format({'bold': True}))
            row += 1
            
            # En-tête
            for col, column in enumerate(config.columns):
                worksheet.write(row, col, column, header_format)
            row += 1
            
            # Données
            for data_row in data.data:
                for col, column in enumerate(config.columns):
                    value = data_row.get(column, "")
                    worksheet.write(row, col, str(value))
                row += 1
        
        # Feuille de métadonnées
        if config.include_metadata and data.metadata:
            metadata_sheet = workbook.add_worksheet('Métadonnées')
            metadata_sheet.write(0, 0, "Métadonnées", workbook.add_format({'bold': True}))
            
            for i, (key, value) in enumerate(data.metadata.items(), 1):
                metadata_sheet.write(i, 0, key)
                metadata_sheet.write(i, 1, str(value))
        
        workbook.close()
        output.seek(0)
        return output.getvalue()

class ReportScheduler:
    """Planificateur de rapports automatiques"""
    
    def __init__(self):
        self.scheduled_reports: Dict[str, Dict[str, Any]] = {}
        self.generator = ReportGenerator()
    
    def schedule_report(self, report_id: str, config: ReportConfig, schedule: str, recipients: List[str]):
        """Planifie un rapport récurrent"""
        self.scheduled_reports[report_id] = {
            "config": config,
            "schedule": schedule,  # Cron-like expression
            "recipients": recipients,
            "last_run": None,
            "next_run": self._calculate_next_run(schedule),
            "active": True
        }
    
    def _calculate_next_run(self, schedule: str) -> datetime:
        """Calcule la prochaine exécution (simplifié)"""
        # Format simplifié: "daily", "weekly", "monthly"
        now = datetime.now()
        
        if schedule == "daily":
            return now + timedelta(days=1)
        elif schedule == "weekly":
            return now + timedelta(weeks=1)
        elif schedule == "monthly":
            return now + timedelta(days=30)
        else:
            return now + timedelta(hours=1)
    
    def run_scheduled_reports(self):
        """Exécute les rapports planifiés"""
        now = datetime.now()
        executed = []
        
        for report_id, report_info in self.scheduled_reports.items():
            if not report_info["active"]:
                continue
            
            if now >= report_info["next_run"]:
                try:
                    # Générer le rapport
                    data = self._collect_data_for_report(report_info["config"])
                    report_bytes = self.generator.generate_report(report_info["config"], data)
                    
                    # Envoyer aux destinataires (simulation)
                    logger.info(f"Rapport {report_id} généré et envoyé à {len(report_info['recipients'])} destinataires")
                    
                    # Mettre à jour le planning
                    report_info["last_run"] = now
                    report_info["next_run"] = self._calculate_next_run(report_info["schedule"])
                    
                    executed.append(report_id)
                    
                except Exception as e:
                    logger.error(f"Erreur lors de l'exécution du rapport {report_id}: {e}")
        
        return executed
    
    def _collect_data_for_report(self, config: ReportConfig) -> ReportData:
        """Collecte les données pour un rapport (simulation)"""
        if config.report_type == ReportType.ANALYTICS_REPORT:
            # Données analytics simulées
            data = [
                {"metric": "Employés totaux", "value": 150, "variation": "+5%"},
                {"metric": "Projets actifs", "value": 12, "variation": "-2%"},
                {"metric": "Taux réconciliation", "value": "87%", "variation": "+3%"},
                {"metric": "Salaire moyen", "value": "$45,000", "variation": "+2%"}
            ]
            
            summary = {
                "total_employees": 150,
                "active_projects": 12,
                "reconciliation_rate": 87,
                "avg_salary": 45000
            }
            
        else:
            # Données génériques
            data = [
                {"id": 1, "name": "Exemple 1", "status": "Actif"},
                {"id": 2, "name": "Exemple 2", "status": "Inactif"}
            ]
            summary = {"total": len(data)}
        
        return ReportData(
            data=data,
            summary=summary,
            metadata={
                "generated_at": datetime.now().isoformat(),
                "report_type": config.report_type.value
            }
        )

# Instance globale
report_generator = ReportGenerator()
report_scheduler = ReportScheduler()

# Fonctions utilitaires
def create_analytics_report(title: str, format: str = "html", filters: Dict[str, Any] = None) -> bytes:
    """Crée un rapport analytics"""
    config = ReportConfig(
        report_type=ReportType.ANALYTICS_REPORT,
        format=ReportFormat(format),
        title=title,
        description="Rapport analytique des données de médiation",
        filters=filters or {},
        columns=["metric", "value", "variation"],
        include_charts=False,
        include_metadata=True,
    )
    
    # Données analytics simulées
    data = [
        {"metric": "Employés totaux", "value": 150, "variation": "+5%"},
        {"metric": "Projets actifs", "value": 12, "variation": "-2%"},
        {"metric": "Taux réconciliation", "value": "87%", "variation": "+3%"},
        {"metric": "Salaire moyen", "value": "$45,000", "variation": "+2%"},
        {"metric": "Conflits résolus", "value": 23, "variation": "+12%"}
    ]
    
    summary = {
        "total_employees": 150,
        "active_projects": 12,
        "reconciliation_rate": 87,
        "avg_salary": 45000,
        "conflicts_resolved": 23
    }
    
    report_data = ReportData(
        data=data,
        summary=summary,
        metadata={
            "generated_at": datetime.now().isoformat(),
            "filters": filters or {}
        }
    )
    
    return report_generator.generate_report(config, report_data)

def create_data_export(table_name: str, format: str = "csv", columns: List[str] = None) -> bytes:
    """Crée un export de données"""
    # Simuler des données (en production, récupérer depuis la base)
    data = []
    if table_name == "GlobalEmployee":
        data = [
            {"employee_id": "EMP:0001", "full_name": "Amine Bensaid", "department": "IT", "status": "ACTIVE"},
            {"employee_id": "EMP:0002", "full_name": "Claire Martin", "department": "Finance", "status": "ACTIVE"},
            {"employee_id": "EMP:0003", "full_name": "Yacine Haddad", "department": "HR", "status": "ACTIVE"}
        ]
        if not columns:
            columns = ["employee_id", "full_name", "department", "status"]

    config = ReportConfig(
        report_type=ReportType.DATA_EXPORT,
        format=ReportFormat(format),
        title=f"Export {table_name}",
        description=f"Export des données de la table {table_name}",
        columns=columns
    )

    report_data = ReportData(
        data=data,
        metadata={
            "table": table_name,
            "row_count": len(data),
            "exported_at": datetime.now().isoformat()
        }
    )

    return report_generator.generate_report(config, report_data)

def get_available_formats() -> List[str]:
    """Retourne les formats disponibles"""
    formats = [fmt.value for fmt in ReportFormat]
    
    # Vérifier les dépendances optionnelles
    if not REPORTLAB_AVAILABLE:
        formats.remove("pdf")
    
    if not XLSX_AVAILABLE:
        formats.remove("xlsx")
    
    return formats

def get_report_templates() -> List[str]:
    """Retourne les templates disponibles"""
    return list(report_generator.templates.keys())
