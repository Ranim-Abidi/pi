import { Component, ViewChild, OnInit } from "@angular/core";
import {
    ChartComponent,
    ApexAxisChartSeries,
    ApexChart,
    ApexXAxis,
    ApexYAxis,
    ApexDataLabels,
    ApexTitleSubtitle,
    ApexStroke,
    ApexGrid,
    ApexPlotOptions
} from "ng-apexcharts";
import { CandidateStatsService, CandidateStats } from "../../services/candidate-stats.service";

export type ChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    yaxis: ApexYAxis;
    xaxis: ApexXAxis;
    dataLabels: ApexDataLabels;
    grid: ApexGrid;
    colors: any;
    stroke: ApexStroke;
    title: ApexTitleSubtitle;
};

@Component({
    selector: 'app-c-dashboard',
    standalone: false,
    templateUrl: './c-dashboard.component.html',
    styleUrls: ['./c-dashboard.component.scss']
})
export class CDashboardComponent implements OnInit {

    @ViewChild("chart") chart: ChartComponent | undefined;
    public chartOptions: Partial<ChartOptions>;
    
    // Stats properties
    stats: CandidateStats | null = null;
    isLoadingStats: boolean = true;
    errorMessage: string = '';
    userName: string = 'Candidate';

    // Chart properties
    applicationsSuccessChart: any = {};
    profileCompletenessChart: any = {};
    formationsChart: any = {};
    applicationsBreakdownChart: any = {};

    constructor(private candidateStatsService: CandidateStatsService) {
        // Initialize with demo data
        this.initializeDemoCharts();
        
        this.chartOptions = {
            series: [
                {
                    name: "Views",
                    data: [0, 41, 35, 51, 49, 62, 69, 91, 148]
                }
            ],
            chart: {
                height: 350,
                type: "line",
                zoom: {
                    enabled: false
                },
                toolbar: {
                    show: false
                }
            },
            dataLabels: {
                enabled: false
            },
            colors: [
                "#1cbe72"
            ],
            stroke: {
                curve: "straight"
            },
            grid: {
                show: true,
                strokeDashArray: 5,
                borderColor: "#e0e6e9",
                row: {
                    colors: ["#f3f3f3", "transparent"],
                    opacity: 0.5
                }
            },
            xaxis: {
                categories: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep"
                ],
                labels: {
                    style: {
                        colors: "#62646A",
                        fontSize: "15px"
                    }
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                }
            },
            yaxis: {
                labels: {
                    style: {
                        colors: "#62646A",
                        fontSize: "15px"
                    }
                },
                axisBorder: {
                    show: false
                }
            }
        };
    }

    /**
     * Initialize charts with demo data for display
     */
    initializeDemoCharts(): void {
        // Applications Success Rate Chart
        this.applicationsSuccessChart = {
            series: [5, 10],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Accepted", "Other"],
            colors: ["#5B7DFF", "#F5A96E"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };

        // Profile Completeness Chart
        this.profileCompletenessChart = {
            series: [65, 35],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Completed", "Incomplete"],
            colors: ["#5B7DFF", "#F5A96E"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };

        // Formations Completion Chart
        this.formationsChart = {
            series: [3, 2],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Completed", "In Progress"],
            colors: ["#5B7DFF", "#F5A96E"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };

        // Applications Breakdown Chart
        this.applicationsBreakdownChart = {
            series: [5, 3, 7],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Accepted", "Rejected", "Pending"],
            colors: ["#10b981", "#ef4444", "#f59e0b"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };
    }

    ngOnInit(): void {
        // Get userName from localStorage
        this.userName = localStorage.getItem('userNom') || 
                       localStorage.getItem('nom') ||
                       localStorage.getItem('userFullName') || 
                       localStorage.getItem('fullName') || 
                       localStorage.getItem('userName') || 
                       'Candidate';
        
        // Clean up email format if it's stored as email
        if (this.userName && this.userName.includes('@')) {
            this.userName = this.userName.split('@')[0].toUpperCase();
        }
        
        this.loadCandidateStats();
    }

    /**
     * Load candidate stats from the service
     */
    loadCandidateStats(): void {
        // Get the candidate ID from localStorage or use a default value
        const candidatId = localStorage.getItem('userId') || '1';
        console.log('Loading stats for candidateId:', candidatId);
        
        this.candidateStatsService.getCandidateStats(Number(candidatId)).subscribe({
            next: (data: CandidateStats) => {
                console.log('Stats loaded successfully:', data);
                this.stats = data;
                // Update userName from stats if available
                if (data.candidatName) {
                    this.userName = data.candidatName;
                }
                this.initializeCharts();
                this.isLoadingStats = false;
            },
            error: (err: any) => {
                console.error('Error loading stats:', err);
                this.errorMessage = 'Failed to load statistics';
                this.isLoadingStats = false;
                // Still show empty cards
                this.stats = null;
            }
        });
    }

    /**
     * Initialize charts with stats data
     */
    initializeCharts(): void {
        if (!this.stats) return;

        // Applications Success Rate Chart
        const acceptedApps = this.stats.acceptedApplications || 0;
        const rejectedApps = this.stats.rejectedApplications || 0;
        const pendingApps = this.stats.pendingApplications || 0;

        this.applicationsSuccessChart = {
            series: [acceptedApps, rejectedApps + pendingApps],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Accepted", "Other"],
            colors: ["#5B7DFF", "#F5A96E"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };

        // Profile Completeness Chart
        const completed = this.stats.profileCompleteness || 0;
        const remaining = Math.max(0, 100 - completed);

        this.profileCompletenessChart = {
            series: [completed, remaining],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Completed", "Incomplete"],
            colors: ["#5B7DFF", "#F5A96E"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };

        // Formations Completion Chart
        const completedFormations = this.stats.completedFormations || 0;
        const inProgressFormations = this.stats.inProgressFormations || 0;

        this.formationsChart = {
            series: [completedFormations, inProgressFormations],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Completed", "In Progress"],
            colors: ["#5B7DFF", "#F5A96E"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };

        // Applications Breakdown Chart
        this.applicationsBreakdownChart = {
            series: [acceptedApps, rejectedApps, pendingApps],
            chart: {
                type: "donut",
                height: 320
            },
            labels: ["Accepted", "Rejected", "Pending"],
            colors: ["#10b981", "#ef4444", "#f59e0b"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "65%"
                    }
                }
            },
            dataLabels: {
                enabled: true
            }
        };
    }

}

