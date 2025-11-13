const stats = [
  { value: "500+", label: "AI Tools Available" },
  { value: "10K+", label: "Active Businesses" },
  { value: "70%", label: "Cost Reduction" },
  { value: "24/7", label: "Expert Support" },
];

const Stats = () => {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold mb-2">{stat.value}</div>
              <div className="text-primary-foreground/80 text-sm lg:text-base">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
