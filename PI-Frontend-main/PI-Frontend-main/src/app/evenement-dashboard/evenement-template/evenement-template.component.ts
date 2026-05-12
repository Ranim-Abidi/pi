import { Component, OnInit, ViewChild } from "@angular/core";
import { ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexStroke, ApexGrid, NgApexchartsModule } from "ng-apexcharts";
import { EvenementService } from "../../services/evenement-service";
import { jwtDecode } from "jwt-decode";

export type ChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    yaxis: ApexYAxis;
    xaxis: ApexXAxis;
    dataLabels: ApexDataLabels;
    grid: ApexGrid;
    colors: any;
    stroke: ApexStroke;
};

@Component({
    selector: 'app-evenement-template',
    standalone: false, 
    templateUrl: './evenement-template.component.html',
    styleUrls: ['./evenement-template.component.scss']
})
export class EvenementTemplateComponent implements OnInit {

    @ViewChild("chart") chart: ChartComponent | undefined;
    public chartOptions: Partial<ChartOptions>;

    // ✅ Stats dynamiques
    totalEvenements = 0;
    totalVilles = 0;
    totalTypes = 0;
    evenements: any[] = [];
    organisateurId!: number;

    constructor(private service: EvenementService) {
        this.chartOptions = {
            series: [{ name: "Participants", data: [0, 0, 0, 0, 0, 0, 0] }],
            chart: { height: 350, type: "line", toolbar: { show: false } },
            dataLabels: { enabled: false },
            colors: ["#1cbe72"],
            stroke: { curve: "straight" },
            grid: { show: true, strokeDashArray: 5 },
            xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"] },
            yaxis: {}
        };
    }

    ngOnInit() {
        // ✅ Récupère l'ID depuis le token
        const token = localStorage.getItem('token');
        if (token) {
            const decoded: any = jwtDecode(token);
            this.organisateurId = decoded?.id;
        }

        // ✅ Charge les événements
        this.service.getByOrganisateur(this.organisateurId).subscribe({
            next: (data) => {
                this.evenements = data;
                this.totalEvenements = data.length;
                this.totalVilles = new Set(data.map((e: any) => e.lieu)).size;
                this.totalTypes = new Set(data.map((e: any) => e.type)).size;
            },
            error: (err) => console.error('Erreur:', err)
        });
    }
}