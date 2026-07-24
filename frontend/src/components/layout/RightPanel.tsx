import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMatch } from "@/api/matches";
import StandingsWidget from "@/components/detail/StandingsWidget";
import TopPlayersWidget from "@/components/detail/TopPlayersWidget";
import PredictionWidget from "@/components/detail/PredictionWidget";

export default function RightPanel() {
  const { id } = useParams();
  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatch(id!),
    enabled: !!id,
  });

  return (
    <div className="flex flex-col gap-3">
      {match && <StandingsWidget match={match} />}
      {match && <TopPlayersWidget match={match} />}
      {match && <PredictionWidget match={match} />}
    </div>
  );
}
