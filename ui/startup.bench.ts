import { bench, cli } from "@hona/strobe";

export default bench({
  targets: {
    measure: cli({
      cwd: "/home/me/notention9/ui",
    }),
  },
  cases: {
    coldStart: {
      primary: "cpu.work",
      run: (ctx) => ctx.exec("node /home/me/notention9/ui/startup-measure-full.mjs true"),
    },
    warmStart: {
      primary: "cpu.work",
      run: (ctx) => ctx.exec("node /home/me/notention9/ui/startup-measure-full.mjs false"),
    },
  },
});