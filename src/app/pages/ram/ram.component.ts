import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatPaginator, MatTableDataSource, MatSort } from '@angular/material';
import * as moment from 'moment';
import * as shape from 'd3-shape';
import { Socket } from 'ng-socket-io';

@Component({
  selector: 'ram-page',
  templateUrl: './ram.component.html',
  styleUrls: ['./ram.component.css']
})
export class RamPageComponent implements OnInit{
  mainData;
  spinner = false;
  displayedColumns = ['#', 'Name', 'Balance', 'Staked', 'Unstaked', 'Currencies Array'];
  dataSource;
  eosToInt = Math.pow(10, 13);
  ramPrice;
  globalStat;
  curve = shape.curveCardinal;

  ngxChartOptions = {
      colorScheme : {
          domain: ['#44a264']
      },
      view : [900, 400],
      showXAxis : true,
      showYAxis : true,
      gradient : true,
      showLegend : false,
      showXAxisLabel : false,
      xAxisLabel : 'EOS',
      showYAxisLabel : true,
      yAxisLabel : 'EOS',
      autoScale : true,
      timeline: true,
      fitContainer : true
  }; 
  mainCurrencyChartDataRes;
  WINDOW: any = window;
  eosNetwork = {
            blockchain: 'eos',
            host: '95.216.153.235',
            port: 8888,
            chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
  };
  eosOptions = {
            broadcast: !0,
            sign: !0,
            chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906"
  };
  identity;
  balance;
  unstaked;
  buyRAM = {
    eos: 0,
    kb : 0
  };
  sellRAM = {
    eos: 0,
    kb : 0
  };
  donation;

  constructor(private route: ActivatedRoute, 
              protected http: HttpClient, 
              private socket: Socket){}

  getGlobal(){
      this.http.get(`/api/v1/get_table_rows/eosio/eosio/global/10`)
          .subscribe((res: any) => {
                          if (!res || !res.rows){
                              return console.error('data error', res);
                          }
                          this.globalStat = res.rows[0];
                      },
                      (error) => {
                          console.error(error);
                      });
  }

  getChart() {
    this.spinner = true;
    let Datefrom = new Date(+new Date() - 24 * 60 * 60 * 1000);
        this.http.post(`/api/v1/get_chart_ram`, { from: Datefrom } )
                  .subscribe(
                      (res: any) => {
                           this.mainCurrencyChartDataRes = this.createChartArr(res);
                           this.spinner = false;
                      },
                      (error) => {
                          console.error(error);
                      });
  }

  createChartArr(data){
    let result = [];
      data.forEach(elem => {
          let quoteBalance  = Number(elem.quote.split(' ')[0]);
          let baseBalance   = Number(elem.base.split(' ')[0]);
          result.push({ name: new Date(elem.date), value: (quoteBalance / baseBalance * 1024).toFixed(8) });
      });
    return result;
  }


  getRam(){
      this.http.get(`/api/v1/get_table_rows/eosio/eosio/rammarket/10`)
          .subscribe((res: any) => {
                          this.countRamPrice(res);
                      },
                      (error) => {
                          console.error(error);
                      });
  }

  countRamPrice(res){
        if (!res || !res.rows || !res.rows[0] || !res.rows[0].quote || !res.rows[0].base){
                return console.error('data error', res);
        }
        let data = res.rows[0];
        let quoteBalance  = Number(data.quote.balance.split(' ')[0]);
        let baseBalance   = Number(data.base.balance.split(' ')[0]);
        this.ramPrice = (quoteBalance / baseBalance * 1024).toFixed(5);
  }

  loginScatter(){
    if (!this.WINDOW.scatter){
        console.error('Please install scatter wallet !');
    }
    this.WINDOW.scatter.getIdentity({
       accounts: [this.eosNetwork]
    }).then(identity => {
        this.identity = identity;
        console.log(identity);
        if (identity && identity.accounts[0] && identity.accounts[0].name){
            this.getAccount(identity.accounts[0].name);
        }
    }).catch(err => {
        console.error(err);
    });
  }

  getAccount(name){
      this.spinner = true;
      this.http.get(`/api/v1/get_account/${name}`)
           .subscribe((res: any) => {
                          this.mainData = res;
                          this.getBalance(name);
                          this.spinner = false;
                      },
                      (error) => {
                          console.error(error);
                          this.spinner = false;
                      });
  }

  getBalance(accountId){
      this.http.get(`/api/v1/get_currency_balance/eosio.token/${accountId}/EOS`)
           .subscribe((res: any) => {
                          this.unstaked = (!res[0]) ? 0 : Number(res[0].split(' ')[0]); 
                          let staked = 0;
                          if (this.mainData.voter_info && this.mainData.voter_info.staked){
                              staked = this.mainData.voter_info.staked;
                          }
                          this.balance = this.unstaked + staked / 10000;
                      },
                      (error) => {
                          console.error(error);
                      });
  }

  funcBuyRAM(quantity) {
    if(!this.identity){
        return console.error('Identity error!!!');
    }
        let amount = Number(quantity);
        if (isNaN(amount)){
          return console.error('Amount must be a number!');
        }
        let requiredFields = {
            accounts: [this.eosNetwork]
        }
        let eos = this.WINDOW.scatter.eos(this.eosNetwork, this.WINDOW.Eos, this.eosOptions, "https");
        eos.contract('eosio', {
            requiredFields
        }).then(contract=>{
            contract.buyram({
                payer: this.identity.accounts[0].name,
                receiver: this.identity.accounts[0].name,
                quant: `${amount} EOS`,
            }).then(trx => {
                 console.log(trx);
            }).catch(err => {
                 console.error(err);
            });  
        });
  }

  funcSellRAM(){

  }
  funcDonation(){

  }

  
  ngOnInit() {
     this.getGlobal();
     this.getRam();
     this.getChart();

      this.socket.on('get_ram', res => {
          this.countRamPrice(res);
      });
  }
}






