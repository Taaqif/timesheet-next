import { useEffect, useState } from "react";
import { Badge } from "./badge";
import { type Tag } from "~/server/api/routers/teamwork";

export const TeamworkTags = (props: { tags: Tag[] }) => {
  const [tags, setTags] = useState<Tag[]>([]);
  useEffect(() => {
    setTags(
      Array.isArray(props.tags) ? props.tags : props.tags ? [props.tags] : [],
    );
  }, [props.tags]);
  return (
    tags?.length > 0 && (
      <>
        {tags.map(
          (t, index) =>
            t && (
              <Badge
                key={index}
                className="px-1 py-0.5 text-xs"
                style={{
                  background: t?.color,
                }}
              >
                {t.name}
              </Badge>
            ),
        )}
      </>
    )
  );
};
